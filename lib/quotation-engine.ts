// lib/quotation-engine.ts
// Pricing calculation engine for Quotation System
import { getDB } from './db'

export interface PriceLineInput {
  productId: string
  productCode: string
  siteType: string
  qty: number
  customAppliancePrice?: number
  customLicensePrice?: number
  isIncluded?: boolean
  notes?: string
  sortOrder?: number
}

export interface PricedLine {
  productId: string
  productCode: string
  description: string
  siteType: string
  qty: number
  applianceUnitPrice: number
  applianceTotal: number
  licenseUnitPrice: number
  year1Fee: number
  year2Fee: number
  year3Fee: number
  year4Fee: number
  year5Fee: number
  lineTotal: number
  isIncluded: boolean
  notes: string
  sortOrder: number
}

export interface QuotationTotals {
  applianceTotal: number
  licenseTotal: number
  serviceTotal: number
  grandTotal: number
  discountAmount: number
  finalPrice: number
  yearlyBreakdown: { year: number; amount: number }[]
}

export interface PricingPreviewInput {
  lines: PriceLineInput[]
  termYears: number
  discountPercent?: number
  targetFinalPrice?: number
  currency?: string
}

export interface PricingPreviewOutput {
  lines: PricedLine[]
  totals: QuotationTotals
  discountPercent: number
  currency: string
}

export async function computePricing(input: PricingPreviewInput): Promise<PricingPreviewOutput> {
  const { lines, termYears, currency = 'HKD' } = input
  const db = getDB()

  const pricedLines: PricedLine[] = []
  let applianceTotal = 0
  let licenseTotal = 0
  let serviceTotal = 0

  for (const line of lines) {
    // Fetch product info
    const productResult = await db.execute({
      sql: `SELECT * FROM qt_products WHERE id = ? OR code = ? LIMIT 1`,
      args: [line.productId, line.productCode],
    })
    const product = productResult.rows[0] as unknown as {
      id: string; code: string; name: string; type: string; description: string
    } | undefined

    // Fetch price policy for this product + term
    const priceResult = await db.execute({
      sql: `SELECT * FROM qt_prices
            WHERE (product_id = ? OR product_id = (SELECT id FROM qt_products WHERE code = ?))
            AND term_years = ?
            AND min_qty <= ?
            AND is_active = 1
            ORDER BY min_qty DESC LIMIT 1`,
      args: [line.productId, line.productCode, termYears, line.qty],
    })
    const pricePolicy = priceResult.rows[0] as unknown as {
      appliance_unit_price: number; license_unit_price: number
    } | undefined

    const appUnitPrice = line.customAppliancePrice ?? (pricePolicy?.appliance_unit_price ?? 0)
    const licUnitPrice = line.customLicensePrice ?? (pricePolicy?.license_unit_price ?? 0)

    const appTotal = appUnitPrice * line.qty
    const yearFee = licUnitPrice * line.qty

    // Build per-year fees
    const yearFees = [0, 0, 0, 0, 0]
    for (let y = 0; y < Math.min(termYears, 5); y++) {
      yearFees[y] = yearFee
    }

    const lineTotal = appTotal + (yearFee * termYears)
    const isService = product?.type === 'service'

    if (line.isIncluded) {
      // Included lines don't add to totals
    } else if (isService) {
      serviceTotal += lineTotal
    } else {
      applianceTotal += appTotal
      licenseTotal += yearFee * termYears
    }

    pricedLines.push({
      productId: product?.id ?? line.productId,
      productCode: product?.code ?? line.productCode,
      description: product?.name ?? line.productCode,
      siteType: line.siteType,
      qty: line.qty,
      applianceUnitPrice: appUnitPrice,
      applianceTotal: appTotal,
      licenseUnitPrice: licUnitPrice,
      year1Fee: yearFees[0],
      year2Fee: yearFees[1],
      year3Fee: yearFees[2],
      year4Fee: yearFees[3],
      year5Fee: yearFees[4],
      lineTotal,
      isIncluded: line.isIncluded ?? false,
      notes: line.notes ?? '',
      sortOrder: line.sortOrder ?? 0,
    })
  }

  const grandTotal = applianceTotal + licenseTotal + serviceTotal
  let discountPercent = input.discountPercent ?? 0
  let discountAmount = 0
  let finalPrice = grandTotal

  if (input.targetFinalPrice !== undefined && input.targetFinalPrice < grandTotal) {
    // Reverse-calculate discount from target price
    finalPrice = input.targetFinalPrice
    discountAmount = grandTotal - finalPrice
    discountPercent = grandTotal > 0 ? (discountAmount / grandTotal) * 100 : 0
  } else if (discountPercent > 0) {
    discountAmount = grandTotal * (discountPercent / 100)
    finalPrice = grandTotal - discountAmount
  }

  // Yearly breakdown for payment schedule
  const yearlyBreakdown: { year: number; amount: number }[] = []
  const discountFactor = grandTotal > 0 ? finalPrice / grandTotal : 1
  for (let y = 1; y <= termYears; y++) {
    let yearAmount = 0
    for (const pl of pricedLines) {
      if (pl.isIncluded) continue
      const yFee = [pl.year1Fee, pl.year2Fee, pl.year3Fee, pl.year4Fee, pl.year5Fee][y - 1] ?? 0
      yearAmount += yFee
    }
    yearlyBreakdown.push({ year: y, amount: Math.round(yearAmount * discountFactor) })
  }

  return {
    lines: pricedLines,
    totals: {
      applianceTotal: Math.round(applianceTotal),
      licenseTotal: Math.round(licenseTotal),
      serviceTotal: Math.round(serviceTotal),
      grandTotal: Math.round(grandTotal),
      discountAmount: Math.round(discountAmount),
      finalPrice: Math.round(finalPrice),
      yearlyBreakdown,
    },
    discountPercent: Math.round(discountPercent * 100) / 100,
    currency,
  }
}

export function formatCurrency(amount: number, currency = 'HKD'): string {
  return new Intl.NumberFormat('en-HK', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function generateDefaultRemarks(
  termYears: number,
  validityDays: number,
  leadTime: string,
  deliveryLocation: string,
  includePs: boolean,
  includeAnnualService: boolean,
  paymentModel: 'one_off' | 'yearly'
): string {
  const lines = [
    `1. License commencement date commences from the date of hardware/software delivery.`,
    `2. This quotation is valid for ${validityDays} days from the date of issue.`,
    `3. Hardware delivery lead time is approximately ${leadTime} upon receipt of order.`,
    `4. Delivery location: ${deliveryLocation}.`,
    `5. Virtual Machine (if applicable) shall be provided by the customer.`,
    includePs
      ? `6. Professional Services (implementation, configuration, and user training) are included.`
      : `6. Professional Services (implementation and configuration) are NOT included in this quotation.`,
    includeAnnualService
      ? `7. Annual on-going maintenance service (5x8 support, software updates, quarterly health check) is included for all ${termYears} year(s) of the contract.`
      : `7. Annual on-going maintenance service is NOT included. Please contact us for a separate quotation.`,
    paymentModel === 'one_off'
      ? `8. Payment: 100% upfront upon signing of the Purchase Order for the full ${termYears}-year contract period.`
      : `8. Payment: Annual payment at the beginning of each contract year.`,
    `9. All prices are in HKD and exclusive of VAT/GST unless otherwise stated.`,
    `10. NextGuard Technology reserves the right to amend the pricing and specifications without prior notice.`,
  ]
  return lines.join('\n')
}
