// @ts-nocheck
import { NextRequest, NextResponse } from "next/server"

const NPOINT_URL = process.env.NPOINT_TICKETS_URL || ""
const ADMIN_SECRET = process.env.CRON_SECRET || ""

// SLA definitions (hours)
const SLA_CONFIG = {
  critical: { response: 1, resolution: 4 },
  high: { response: 4, resolution: 24 },
  medium: { response: 8, resolution: 72 },
  low: { response: 24, resolution: 168 },
}

const CATEGORIES = [
  "installation", "configuration", "bug_report", "feature_request",
  "performance", "connectivity", "license", "upgrade", "security_incident", "general"
]

function generateTicketId() {
  const prefix = "NG"
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, "")
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `${prefix}-${date}-${rand}`
}

function calculateSLADeadlines(priority: string, createdAt: string) {
  const sla = SLA_CONFIG[priority as keyof typeof SLA_CONFIG] || SLA_CONFIG.medium
  const created = new Date(createdAt)
  return {
    responseDeadline: new Date(created.getTime() + sla.response * 3600000).toISOString(),
    resolutionDeadline: new Date(created.getTime() + sla.resolution * 3600000).toISOString(),
  }
}

async function getData() {
  const res = await fetch(NPOINT_URL, { cache: "no-store" })
  return res.json()
}

async function saveData(data: any) {
  await fetch(NPOINT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
}

// GET: List tickets (with filters)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const email = searchParams.get("email") || ""
    const ticketId = searchParams.get("ticketId") || ""
    const status = searchParams.get("status") || ""
    const priority = searchParams.get("priority") || ""
    const assignee = searchParams.get("assignee") || ""
    const secret = searchParams.get("secret") || req.headers.get("authorization")?.replace("Bearer ", "") || ""
    const isAdmin = secret === ADMIN_SECRET

    const data = await getData()
    let tickets = data.tickets || []

    // Non-admin can only see their own tickets
    if (!isAdmin && !email && !ticketId) {
      return NextResponse.json({ error: "Email or ticketId required" }, { status: 400 })
    }

    if (email && !isAdmin) tickets = tickets.filter((t: any) => t.customerEmail === email)
    if (ticketId) tickets = tickets.filter((t: any) => t.ticketId === ticketId)
    if (status) tickets = tickets.filter((t: any) => t.status === status)
    if (priority) tickets = tickets.filter((t: any) => t.priority === priority)
    if (assignee && isAdmin) tickets = tickets.filter((t: any) => t.assignee === assignee)

    // Calculate SLA status for each ticket
    const now = new Date()
    tickets = tickets.map((t: any) => {
      const slaStatus = {
        responseBreached: !t.firstResponseAt && now > new Date(t.sla.responseDeadline),
        resolutionBreached: t.status !== "resolved" && t.status !== "closed" && now > new Date(t.sla.resolutionDeadline),
        responseTimeRemaining: t.firstResponseAt ? 0 : Math.max(0, new Date(t.sla.responseDeadline).getTime() - now.getTime()),
        resolutionTimeRemaining: (t.status === "resolved" || t.status === "closed") ? 0 : Math.max(0, new Date(t.sla.resolutionDeadline).getTime() - now.getTime()),
      }
      return { ...t, slaStatus }
    })

    // Sort by priority then date
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
    tickets.sort((a: any, b: any) => {
      const pa = priorityOrder[a.priority] ?? 4
      const pb = priorityOrder[b.priority] ?? 4
      if (pa !== pb) return pa - pb
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    // KPI stats for admin
    let kpi = null
    if (isAdmin) {
      const all = data.tickets || []
      const open = all.filter((t: any) => !["resolved", "closed"].includes(t.status))
      const breachedResponse = all.filter((t: any) => !t.firstResponseAt && new Date(t.sla.responseDeadline) < now && !["resolved","closed"].includes(t.status))
      const breachedResolution = all.filter((t: any) => !["resolved","closed"].includes(t.status) && new Date(t.sla.resolutionDeadline) < now)
      const resolved = all.filter((t: any) => t.status === "resolved" || t.status === "closed")
      const avgResTime = resolved.length > 0 ? resolved.reduce((s: number, t: any) => {
        const created = new Date(t.createdAt).getTime()
        const res = new Date(t.resolvedAt || t.updatedAt).getTime()
        return s + (res - created)
      }, 0) / resolved.length / 3600000 : 0
      kpi = {
        totalTickets: all.length,
        openTickets: open.length,
        resolvedTickets: resolved.length,
        breachedResponse: breachedResponse.length,
        breachedResolution: breachedResolution.length,
        avgResolutionHours: Math.round(avgResTime * 10) / 10,
        byPriority: {
          critical: open.filter((t: any) => t.priority === "critical").length,
          high: open.filter((t: any) => t.priority === "high").length,
          medium: open.filter((t: any) => t.priority === "medium").length,
          low: open.filter((t: any) => t.priority === "low").length,
        },
        byStatus: {
          new: all.filter((t: any) => t.status === "new").length,
          open: all.filter((t: any) => t.status === "open").length,
          in_progress: all.filter((t: any) => t.status === "in_progress").length,
          waiting_customer: all.filter((t: any) => t.status === "waiting_customer").length,
          waiting_vendor: all.filter((t: any) => t.status === "waiting_vendor").length,
          resolved: all.filter((t: any) => t.status === "resolved").length,
          closed: all.filter((t: any) => t.status === "closed").length,
        },
      }
    }

    return NextResponse.json({ tickets, total: tickets.length, kpi })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST: Create new ticket
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { customerName, customerEmail, customerCompany, subject, description, category, priority, product, version } = body

    if (!customerName || !customerEmail || !subject || !description) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }
    if (priority && !SLA_CONFIG[priority as keyof typeof SLA_CONFIG]) {
      return NextResponse.json({ error: "Invalid priority" }, { status: 400 })
    }

    const now = new Date().toISOString()
    const ticketPriority = priority || "medium"
    const ticketId = generateTicketId()
    const sla = calculateSLADeadlines(ticketPriority, now)

    const ticket = {
      ticketId,
      subject,
      description,
      category: category || "general",
      priority: ticketPriority,
      status: "new",
      customerName,
      customerEmail,
      customerCompany: customerCompany || "",
      product: product || "NextGuard DLP",
      version: version || "",
      assignee: "",
      sla: { ...sla, config: SLA_CONFIG[ticketPriority as keyof typeof SLA_CONFIG] },
      firstResponseAt: null,
      resolvedAt: null,
      closedAt: null,
      createdAt: now,
      updatedAt: now,
      timeline: [
        { type: "created", message: "Ticket created", by: customerName, at: now }
      ],
      comments: [],
    }

    const data = await getData()
    data.tickets = [ticket, ...(data.tickets || [])]
    await saveData(data)

    return NextResponse.json({ success: true, ticket })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// PUT: Update ticket (admin or customer comment)
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { ticketId, action, secret, email, comment, status, priority, assignee } = body
    const isAdmin = secret === ADMIN_SECRET

    if (!ticketId) return NextResponse.json({ error: "ticketId required" }, { status: 400 })

    const data = await getData()
    const idx = (data.tickets || []).findIndex((t: any) => t.ticketId === ticketId)
    if (idx === -1) return NextResponse.json({ error: "Ticket not found" }, { status: 404 })

    const ticket = data.tickets[idx]
    const now = new Date().toISOString()
    ticket.updatedAt = now

    if (action === "comment") {
      if (!comment) return NextResponse.json({ error: "Comment required" }, { status: 400 })
      const isStaff = isAdmin
      const by = isStaff ? (body.staffName || "Support Team") : ticket.customerName
      ticket.comments.push({ id: Date.now().toString(36), message: comment, by, isStaff, at: now })
      ticket.timeline.push({ type: "comment", message: `${isStaff ? "Support" : "Customer"} replied`, by, at: now })
      // First response tracking
      if (isStaff && !ticket.firstResponseAt) {
        ticket.firstResponseAt = now
        ticket.timeline.push({ type: "sla", message: "First response SLA met", by: "System", at: now })
      }
      // Auto-update status
      if (isStaff && ticket.status === "new") ticket.status = "open"
      if (!isStaff && ticket.status === "waiting_customer") ticket.status = "open"
    }

    if (action === "update_status" && isAdmin) {
      if (!status) return NextResponse.json({ error: "Status required" }, { status: 400 })
      const oldStatus = ticket.status
      ticket.status = status
      ticket.timeline.push({ type: "status", message: `Status changed: ${oldStatus} -> ${status}`, by: body.staffName || "Support", at: now })
      if (status === "resolved") ticket.resolvedAt = now
      if (status === "closed") ticket.closedAt = now
    }

    if (action === "assign" && isAdmin) {
      ticket.assignee = assignee || ""
      ticket.timeline.push({ type: "assign", message: `Assigned to ${assignee || "Unassigned"}`, by: body.staffName || "Support", at: now })
    }

    if (action === "update_priority" && isAdmin) {
      const oldPriority = ticket.priority
      ticket.priority = priority
      ticket.sla = { ...calculateSLADeadlines(priority, ticket.createdAt), config: SLA_CONFIG[priority as keyof typeof SLA_CONFIG] }
      ticket.timeline.push({ type: "priority", message: `Priority changed: ${oldPriority} -> ${priority}`, by: body.staffName || "Support", at: now })
    }

    data.tickets[idx] = ticket
    await saveData(data)

    return NextResponse.json({ success: true, ticket })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
