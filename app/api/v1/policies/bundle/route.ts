// Policy Bundle API - NextGuard Management Console
// Enterprise-grade DLP Policy Engine
// Reference: Forcepoint 1700+ classifiers, Symantec DLP, McAfee, PA Panorama, Zscaler, Netskope
// Implements: FCAPS Configuration Management (CM) - Policy distribution to agents

import { NextRequest, NextResponse } from 'next/server'

// === DETECTION MODE CONFIGURATION ===
// Supports: traditional (regex/keyword), ai (LLM-based), hybrid (both)
const DETECTION_MODES = ['traditional', 'ai', 'hybrid'] as const

// === ENTERPRISE DLP POLICY CATEGORIES (Reference: Forcepoint, Symantec, Gartner 2025) ===
const DEFAULT_POLICIES = [
  // ========== CATEGORY 1: PII - Personally Identifiable Information ==========
  { id: 'pii-cc-detect', name: 'Credit Card Number', description: 'Visa/MC/Amex/Discover/JCB/UnionPay credit card patterns (PCI-DSS)', category: 'PII', patterns: ['\\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13})\\b'], keywords: [], severity: 'critical', action: 'block', channels: ['file','clipboard','network','email','usb','cloud','print'], enabled: true, complianceFramework: 'PCI-DSS', detectionMode: 'hybrid', version: 1 },
  { id: 'pii-hkid-detect', name: 'Hong Kong ID', description: 'HKID number pattern (PDPO)', category: 'PII', patterns: ['\\b[A-Z]{1,2}[0-9]{6}\\(?[0-9A]\\)?\\b'], keywords: [], severity: 'critical', action: 'block', channels: ['file','clipboard','network','email','usb','cloud','print'], enabled: true, complianceFramework: 'PDPO', detectionMode: 'hybrid', version: 1 },
  { id: 'pii-email-detect', name: 'Email Address', description: 'Email address pattern (GDPR)', category: 'PII', patterns: ['\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\\b'], keywords: [], severity: 'low', action: 'audit', channels: ['file','clipboard','network','email'], enabled: true, complianceFramework: 'GDPR', detectionMode: 'traditional', version: 1 },
  { id: 'pii-phone-hk', name: 'HK Phone Number', description: 'Hong Kong phone number (PDPO)', category: 'PII', patterns: ['\\b(?:\\+?852[\\s-]?)?[2-9][0-9]{3}[\\s-]?[0-9]{4}\\b'], keywords: [], severity: 'medium', action: 'audit', channels: ['file','clipboard','network','email'], enabled: true, complianceFramework: 'PDPO', detectionMode: 'traditional', version: 1 },
  { id: 'pii-ssn-us', name: 'US Social Security Number', description: 'US SSN pattern (HIPAA/SOX)', category: 'PII', patterns: ['\\b[0-9]{3}-[0-9]{2}-[0-9]{4}\\b'], keywords: [], severity: 'critical', action: 'block', channels: ['file','clipboard','network','email','usb','cloud','print'], enabled: true, complianceFramework: 'HIPAA', detectionMode: 'hybrid', version: 1 },
  { id: 'pii-passport', name: 'Passport Number', description: 'Common passport number formats (GDPR)', category: 'PII', patterns: ['\\b[A-Z]{1,2}[0-9]{6,8}\\b'], keywords: ['passport','travel document'], severity: 'high', action: 'block', channels: ['file','clipboard','network','email'], enabled: true, complianceFramework: 'GDPR', detectionMode: 'hybrid', version: 1 },
  { id: 'pii-iban', name: 'IBAN / Bank Account', description: 'International bank account numbers (GDPR)', category: 'PII', patterns: ['\\b[A-Z]{2}[0-9]{2}\\s?[A-Z0-9]{4}\\s?[0-9]{4}\\s?[0-9]{4}\\s?[0-9]{0,4}\\s?[0-9]{0,4}\\b'], keywords: [], severity: 'high', action: 'block', channels: ['file','clipboard','network','email','usb'], enabled: true, complianceFramework: 'GDPR', detectionMode: 'hybrid', version: 1 },
  { id: 'pii-cn-id', name: 'China National ID', description: 'PRC Resident Identity Card number (PIPL)', category: 'PII', patterns: ['\\b[0-9]{6}(19|20)[0-9]{2}(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])[0-9]{3}[0-9Xx]\\b'], keywords: [], severity: 'critical', action: 'block', channels: ['file','clipboard','network','email','usb','cloud'], enabled: true, complianceFramework: 'PIPL', detectionMode: 'hybrid', version: 1 },
  { id: 'pii-dob', name: 'Date of Birth', description: 'Date of birth patterns with context', category: 'PII', patterns: ['\\b(0[1-9]|[12][0-9]|3[01])[-/](0[1-9]|1[0-2])[-/](19|20)[0-9]{2}\\b'], keywords: ['date of birth','DOB','birthday','born on'], severity: 'medium', action: 'audit', channels: ['file','clipboard','network','email'], enabled: true, complianceFramework: 'GDPR', detectionMode: 'traditional', version: 1 },
  { id: 'pii-drivers-license', name: 'Driver License Number', description: 'Driver license patterns (multi-jurisdiction)', category: 'PII', patterns: ['\\b[A-Z]{1,2}[0-9]{5,8}\\b'], keywords: ['driver license','driving licence','DL number'], severity: 'high', action: 'block', channels: ['file','clipboard','network','email','usb'], enabled: true, complianceFramework: 'GDPR', detectionMode: 'hybrid', version: 1 },
  // ========== CATEGORY 2: PHI - Protected Health Information ==========
  { id: 'phi-medical-record', name: 'Medical Record Number', description: 'Healthcare medical record identifiers (HIPAA)', category: 'PHI', patterns: ['\\bMRN[:\\s]?[0-9]{6,10}\\b'], keywords: ['medical record','patient ID','MRN'], severity: 'critical', action: 'block', channels: ['file','clipboard','network','email','usb','cloud','print'], enabled: true, complianceFramework: 'HIPAA', detectionMode: 'hybrid', version: 1 },
  { id: 'phi-health-insurance', name: 'Health Insurance ID', description: 'Health insurance policy numbers', category: 'PHI', patterns: ['\\b[A-Z]{3}[0-9]{9}\\b'], keywords: ['health insurance','policy number','member ID','group number'], severity: 'high', action: 'block', channels: ['file','clipboard','network','email','usb'], enabled: true, complianceFramework: 'HIPAA', detectionMode: 'hybrid', version: 1 },
  { id: 'phi-diagnosis', name: 'Medical Diagnosis / ICD Codes', description: 'ICD-10/ICD-11 diagnosis codes with patient context', category: 'PHI', patterns: ['\\b[A-Z][0-9]{2}\\.[0-9]{1,4}\\b'], keywords: ['diagnosis','ICD-10','ICD-11','medical condition','prognosis'], severity: 'high', action: 'block', channels: ['file','clipboard','network','email','cloud'], enabled: true, complianceFramework: 'HIPAA', detectionMode: 'ai', version: 1 },
  { id: 'phi-prescription', name: 'Prescription / Drug Information', description: 'Prescription details with patient identifiers', category: 'PHI', patterns: [], keywords: ['prescription','Rx','dosage','medication','drug name','pharmacy'], severity: 'high', action: 'audit', channels: ['file','clipboard','network','email'], enabled: true, complianceFramework: 'HIPAA', detectionMode: 'ai', version: 1 },
  // ========== CATEGORY 3: Financial Data ==========
  { id: 'fin-swift-code', name: 'SWIFT/BIC Code', description: 'SWIFT bank identifier codes', category: 'Financial', patterns: ['\\b[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?\\b'], keywords: ['SWIFT','BIC','bank transfer','wire transfer'], severity: 'high', action: 'block', channels: ['file','clipboard','network','email','usb'], enabled: true, complianceFramework: 'SOX', detectionMode: 'traditional', version: 1 },
  { id: 'fin-tax-id', name: 'Tax Identification Number', description: 'Tax ID / EIN / TIN patterns (multi-jurisdiction)', category: 'Financial', patterns: ['\\b[0-9]{2}-[0-9]{7}\\b'], keywords: ['tax ID','EIN','TIN','taxpayer'], severity: 'high', action: 'block', channels: ['file','clipboard','network','email','usb','cloud'], enabled: true, complianceFramework: 'SOX', detectionMode: 'hybrid', version: 1 },
  { id: 'fin-bank-statement', name: 'Bank Statement / Financial Report', description: 'Financial statements and banking documents', category: 'Financial', patterns: [], keywords: ['account balance','bank statement','transaction history','wire transfer','financial statement','earnings report','10-K','10-Q'], severity: 'high', action: 'audit', channels: ['file','clipboard','network','email','usb','cloud','print'], enabled: true, complianceFramework: 'SOX', detectionMode: 'ai', version: 1 },
  { id: 'fin-crypto-wallet', name: 'Cryptocurrency Wallet Address', description: 'Bitcoin/Ethereum wallet addresses', category: 'Financial', patterns: ['\\b(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,39}\\b','\\b0x[a-fA-F0-9]{40}\\b'], keywords: ['wallet','crypto','bitcoin','ethereum'], severity: 'high', action: 'block', channels: ['file','clipboard','network','email'], enabled: true, complianceFramework: 'AML', detectionMode: 'traditional', version: 1 },
  // ========== CATEGORY 4: Intellectual Property (IP) ==========
  { id: 'ip-source-code', name: 'Software Source Code', description: 'Detection of proprietary source code exfiltration (Ref: Forcepoint IP policies)', category: 'IP', patterns: [], keywords: ['import ','#include','def ','class ','function ','const ','export default','package main','func main'], severity: 'critical', action: 'block', channels: ['file','clipboard','network','email','usb','cloud'], enabled: true, complianceFramework: 'Trade-Secret', detectionMode: 'ai', version: 1 },
  { id: 'ip-design-docs', name: 'Software Design Documents', description: 'Architecture diagrams, technical specifications, API docs', category: 'IP', patterns: [], keywords: ['architecture','technical specification','API documentation','system design','UML','sequence diagram','ERD','wireframe'], severity: 'high', action: 'audit', channels: ['file','clipboard','network','email','usb','cloud','print'], enabled: true, complianceFramework: 'Trade-Secret', detectionMode: 'ai', version: 1 },
  { id: 'ip-patent-trade-secret', name: 'Patent & Trade Secrets', description: 'Patent applications, trade secret documents', category: 'IP', patterns: [], keywords: ['patent','trade secret','proprietary','invention disclosure','prior art','patent pending','patent application'], severity: 'critical', action: 'block', channels: ['file','clipboard','network','email','usb','cloud','print'], enabled: true, complianceFramework: 'Trade-Secret', detectionMode: 'ai', version: 1 },
  { id: 'ip-engineering', name: 'Engineering / CAD / Blueprints', description: 'Engineering drawings, CAD files, manufacturing specs', category: 'IP', patterns: [], keywords: ['blueprint','CAD','schematic','engineering drawing','BOM','bill of materials','manufacturing spec'], severity: 'critical', action: 'block', channels: ['file','clipboard','network','email','usb','cloud','print'], enabled: true, complianceFramework: 'Trade-Secret', detectionMode: 'ai', version: 1 },
  // ========== CATEGORY 5: Sensitive Keywords & Classification ==========
  { id: 'cls-sensitive-keywords', name: 'Sensitive Keywords', description: 'Classification labels and sensitive terms (ISO27001)', category: 'Classification', patterns: [], keywords: ['confidential','secret','classified','internal only','do not distribute','password','restricted'], severity: 'high', action: 'block', channels: ['file','clipboard','network','email','usb','cloud','print'], enabled: true, complianceFramework: 'ISO27001', detectionMode: 'traditional', version: 1 },
  { id: 'cls-sensitive-keywords-zh', name: 'Sensitive Keywords (Chinese)', description: 'Chinese classification labels and sensitive terms', category: 'Classification', patterns: [], keywords: ['\u6a5f\u5bc6','\u79d8\u5bc6','\u7d55\u5bc6','\u5167\u90e8','\u9650\u95b1','\u7981\u6b62\u5206\u767c','\u5bc6\u78bc','\u4fdd\u5bc6'], severity: 'high', action: 'block', channels: ['file','clipboard','network','email','usb','cloud','print'], enabled: true, complianceFramework: 'ISO27001', detectionMode: 'traditional', version: 1 },
  { id: 'cls-api-keys', name: 'API Keys & Secrets', description: 'AWS keys, tokens, passwords in code (NIST)', category: 'Credentials', patterns: ['(?i)(?:api[_-]?key|secret[_-]?key|auth[_-]?token)\\s*[=:]\\s*[\'\"][A-Za-z0-9-_]{16,}'], keywords: [], severity: 'critical', action: 'block', channels: ['file','clipboard','network','email','cloud'], enabled: true, complianceFramework: 'NIST-800-171', detectionMode: 'hybrid', version: 1 },
  { id: 'cls-private-keys', name: 'Private Keys & Certificates', description: 'SSH keys, SSL certificates, PEM files', category: 'Credentials', patterns: ['-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----','-----BEGIN CERTIFICATE-----'], keywords: ['private key','ssl cert','ssh key'], severity: 'critical', action: 'block', channels: ['file','clipboard','network','email','usb','cloud'], enabled: true, complianceFramework: 'NIST-800-171', detectionMode: 'traditional', version: 1 },
  // ========== CATEGORY 6: Regulatory Compliance ==========
  { id: 'reg-gdpr-data-subject', name: 'GDPR Data Subject Information', description: 'EU resident personal data requiring GDPR protection', category: 'Compliance', patterns: [], keywords: ['data subject','right to erasure','right to be forgotten','data portability','consent withdrawal','data processing agreement'], severity: 'high', action: 'audit', channels: ['file','clipboard','network','email','cloud'], enabled: true, complianceFramework: 'GDPR', detectionMode: 'ai', version: 1 },
  { id: 'reg-pci-cardholder', name: 'PCI Cardholder Data Environment', description: 'Full magnetic stripe data, CVV, PIN blocks', category: 'Compliance', patterns: [], keywords: ['magnetic stripe','CVV','CVV2','CVC','PIN block','cardholder data','card verification'], severity: 'critical', action: 'block', channels: ['file','clipboard','network','email','usb','cloud','print'], enabled: true, complianceFramework: 'PCI-DSS', detectionMode: 'hybrid', version: 1 },
  { id: 'reg-sox-financial', name: 'SOX Financial Controls', description: 'Financial audit data, internal controls documentation', category: 'Compliance', patterns: [], keywords: ['SOX compliance','internal control','audit finding','material weakness','financial restatement','PCAOB'], severity: 'high', action: 'audit', channels: ['file','clipboard','network','email','usb','cloud','print'], enabled: true, complianceFramework: 'SOX', detectionMode: 'ai', version: 1 },
  { id: 'reg-ferpa-education', name: 'FERPA Student Records', description: 'Student education records (US education sector)', category: 'Compliance', patterns: [], keywords: ['student record','transcript','GPA','enrollment','FERPA','education record','student ID'], severity: 'high', action: 'block', channels: ['file','clipboard','network','email','usb','cloud'], enabled: true, complianceFramework: 'FERPA', detectionMode: 'hybrid', version: 1 },
  // ========== CATEGORY 7: Company Confidential & Strategic ==========
  { id: 'biz-merger-acquisition', name: 'M&A / Strategic Documents', description: 'Merger, acquisition, and strategic business documents', category: 'Business', patterns: [], keywords: ['merger','acquisition','due diligence','letter of intent','LOI','term sheet','valuation','takeover','buyout'], severity: 'critical', action: 'block', channels: ['file','clipboard','network','email','usb','cloud','print'], enabled: true, complianceFramework: 'SEC', detectionMode: 'ai', version: 1 },
  { id: 'biz-board-minutes', name: 'Board Minutes & Executive Communication', description: 'Board meeting minutes, executive memos, strategic plans', category: 'Business', patterns: [], keywords: ['board minutes','board resolution','executive summary','strategic plan','board of directors','shareholder meeting'], severity: 'critical', action: 'block', channels: ['file','clipboard','network','email','usb','cloud','print'], enabled: true, complianceFramework: 'SOX', detectionMode: 'ai', version: 1 },
  { id: 'biz-customer-list', name: 'Customer / Vendor Lists', description: 'Customer databases, vendor lists, pricing sheets', category: 'Business', patterns: [], keywords: ['customer list','client list','vendor list','supplier list','pricing sheet','rate card','customer database'], severity: 'high', action: 'block', channels: ['file','clipboard','network','email','usb','cloud','print'], enabled: true, complianceFramework: 'Trade-Secret', detectionMode: 'ai', version: 1 },
  { id: 'biz-hr-employee', name: 'HR / Employee Data', description: 'Employee records, salary data, performance reviews', category: 'Business', patterns: [], keywords: ['employee record','salary','compensation','performance review','termination','disciplinary','benefits enrollment','payroll'], severity: 'high', action: 'block', channels: ['file','clipboard','network','email','usb','cloud','print'], enabled: true, complianceFramework: 'GDPR', detectionMode: 'hybrid', version: 1 },
  // ========== CATEGORY 8: Data Theft Risk Indicators (Ref: Forcepoint RAP) ==========
  { id: 'risk-bulk-download', name: 'Bulk Data Download', description: 'Unusual bulk data extraction patterns', category: 'Risk-Indicator', patterns: [], keywords: ['SELECT * FROM','database dump','export all','bulk download','data extraction'], severity: 'critical', action: 'block', channels: ['file','clipboard','network','usb','cloud'], enabled: true, complianceFramework: 'NIST-800-171', detectionMode: 'ai', version: 1 },
  { id: 'risk-encrypted-exfil', name: 'Encrypted File Exfiltration', description: 'Password-protected or encrypted file transfers', category: 'Risk-Indicator', patterns: [], keywords: ['password protected','encrypted archive','.7z','.rar','.zip encrypted','AES encrypted'], severity: 'high', action: 'audit', channels: ['file','network','email','usb','cloud'], enabled: true, complianceFramework: 'NIST-800-171', detectionMode: 'ai', version: 1 },
  { id: 'risk-after-hours', name: 'After-Hours Data Access', description: 'Sensitive data access outside business hours', category: 'Risk-Indicator', patterns: [], keywords: [], severity: 'medium', action: 'audit', channels: ['file','clipboard','network','email','usb','cloud'], enabled: true, complianceFramework: 'ISO27001', detectionMode: 'ai', version: 1 },
  { id: 'risk-resignation', name: 'Employee Resignation Risk', description: 'Data exfiltration patterns from departing employees', category: 'Risk-Indicator', patterns: [], keywords: ['resignation','two weeks notice','last day','exit interview','handover'], severity: 'high', action: 'audit', channels: ['file','clipboard','network','email','usb','cloud'], enabled: true, complianceFramework: 'ISO27001', detectionMode: 'ai', version: 1 },
  // ========== CATEGORY 9: Industry-Specific ==========
  { id: 'ind-telecom-cdr', name: 'Telecom Call Detail Records', description: 'CDR, IMEI, phone metadata', category: 'Industry', patterns: ['\\b[0-9]{15}\\b'], keywords: ['CDR','IMEI','call detail record','IMSI','subscriber'], severity: 'high', action: 'block', channels: ['file','clipboard','network','email','usb','cloud'], enabled: true, complianceFramework: 'GDPR', detectionMode: 'hybrid', version: 1 },
  { id: 'ind-legal-privilege', name: 'Legal Privileged Communication', description: 'Attorney-client privilege documents', category: 'Industry', patterns: [], keywords: ['attorney-client','legal privilege','litigation hold','privileged and confidential','work product doctrine','legal opinion'], severity: 'critical', action: 'block', channels: ['file','clipboard','network','email','usb','cloud','print'], enabled: true, complianceFramework: 'Legal-Privilege', detectionMode: 'ai', version: 1 },
  { id: 'ind-scada-ot', name: 'SCADA / OT / Critical Infrastructure', description: 'Industrial control system data (Ref: Forcepoint Energy)', category: 'Industry', patterns: [], keywords: ['SCADA','PLC','HMI','Modbus','OPC-UA','industrial control','power grid','RTU'], severity: 'critical', action: 'block', channels: ['file','clipboard','network','email','usb','cloud'], enabled: true, complianceFramework: 'NERC-CIP', detectionMode: 'hybrid', version: 1 },
  // ========== CATEGORY 10: GenAI & Cloud Security ==========
  { id: 'ai-prompt-data-leak', name: 'GenAI Prompt Data Leakage', description: 'Sensitive data submitted to AI/LLM services (Ref: Gartner 2025)', category: 'AI-Security', patterns: [], keywords: ['ChatGPT','Claude','Gemini','Copilot','prompt','AI assistant'], severity: 'high', action: 'audit', channels: ['browser','network','clipboard'], enabled: true, complianceFramework: 'ISO27001', detectionMode: 'ai', version: 1 },
  { id: 'ai-model-exfil', name: 'AI Model / Training Data', description: 'ML model weights, training datasets, embeddings', category: 'AI-Security', patterns: [], keywords: ['model weights','.pt','.h5','.onnx','training data','fine-tune','embedding','tensor','checkpoint'], severity: 'critical', action: 'block', channels: ['file','network','email','usb','cloud'], enabled: true, complianceFramework: 'Trade-Secret', detectionMode: 'ai', version: 1 },
]

// === AI DETECTION MODE GLOBAL CONFIG ===
const AI_CONFIG = {
  globalDetectionMode: 'hybrid' as 'traditional' | 'ai' | 'hybrid',
  aiProvider: 'nextguard-ai',
  aiConfidenceThreshold: 0.85,
  aiModelVersion: 'ng-dlp-v2.0',
  traditionalOnly: false,
  features: {
    contentInspection: true,
    contextAnalysis: true,
    behaviorAnalysis: true,
    imageOCR: true,
    documentFingerprinting: true,
    exactDataMatch: true,
    indexedDocumentMatch: true,
    machineLearningClassification: true,
    naturalLanguageProcessing: true,
    riskAdaptiveProtection: true,
  }
}

export async function GET() {
  const bundleId = `bundle-${Date.now()}`
  const categories = [...new Set(DEFAULT_POLICIES.map(p => p.category))]
  const byCategory: Record<string, number> = {}
  categories.forEach(c => { byCategory[c] = DEFAULT_POLICIES.filter(p => p.category === c).length })

  return NextResponse.json({
    success: true,
    bundle: {
      bundleId,
      version: 2,
      policies: DEFAULT_POLICIES,
      totalRules: DEFAULT_POLICIES.length,
      categories,
      byCategory,
      timestamp: new Date().toISOString(),
    },
    aiConfig: AI_CONFIG,
    detectionModes: DETECTION_MODES,
  })
}
