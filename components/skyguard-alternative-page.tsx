'use client'

import { Shield, Zap, Cloud, Brain, ArrowRight, CheckCircle, XCircle, Minus } from 'lucide-react'
import Link from 'next/link'

const comparisonData = [
  { feature: 'AI-Powered Content Analysis', nextguard: 'full', skyguard: 'partial', note: 'NextGuard uses LLM-based classification with 99%+ accuracy' },
  { feature: 'Real-Time Threat Detection', nextguard: 'full', skyguard: 'full', note: '' },
  { feature: 'Cloud-Native Architecture', nextguard: 'full', skyguard: 'none', note: 'NextGuard is built cloud-first; SkyGuard requires on-premise servers' },
  { feature: 'Multi-Channel DLP (Network, Endpoint, Email, Web, Mobile)', nextguard: 'full', skyguard: 'full', note: '' },
  { feature: 'Zero Trust / SASE Integration', nextguard: 'full', skyguard: 'partial', note: 'NextGuard offers native SASE; SkyGuard requires additional modules' },
  { feature: 'Insider Threat Management (UEBA)', nextguard: 'full', skyguard: 'full', note: '' },
  { feature: 'Microsoft MIP / Purview Integration', nextguard: 'full', skyguard: 'none', note: 'Deep bi-directional sync with Microsoft ecosystem' },
  { feature: 'OCR for Image-Based Data', nextguard: 'full', skyguard: 'full', note: '' },
  { feature: 'API-First Design', nextguard: 'full', skyguard: 'partial', note: 'NextGuard exposes full REST API for automation' },
  { feature: 'Multi-Tenant SaaS Console', nextguard: 'full', skyguard: 'none', note: 'Built for MSPs and distributed enterprises' },
  { feature: 'Automated Data Classification (AI)', nextguard: 'full', skyguard: 'partial', note: 'LLM-driven vs rule-based classification' },
  { feature: 'Global Compliance (GDPR, PDPO, PIPL)', nextguard: 'full', skyguard: 'partial', note: 'NextGuard supports HK PDPO and APAC regulations natively' },
  { feature: 'Deployment Flexibility', nextguard: 'full', skyguard: 'full', note: 'Both support hybrid; NextGuard adds pure-cloud option' },
  { feature: 'Modern UI / Dashboard', nextguard: 'full', skyguard: 'partial', note: 'NextGuard uses modern React-based dashboard' },
]

function StatusIcon({ status }: { status: string }) {
  if (status === 'full') return <CheckCircle className="w-5 h-5 text-green-400" />
  if (status === 'partial') return <Minus className="w-5 h-5 text-yellow-400" />
  return <XCircle className="w-5 h-5 text-red-400" />
}

export function SkyguardAlternativePage() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section */}
      <section className="relative py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-900/20 to-transparent" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-block px-4 py-1 rounded-full border border-cyan-500/30 text-cyan-400 text-sm mb-6">
            DLP COMPARISON 2026
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            NextGuard vs SkyGuard DLP
          </h1>
          <p className="text-lg text-gray-400 mb-4 max-w-2xl mx-auto">
            Looking for a modern alternative to SkyGuard DLP? NextGuard combines the proven
            SkyGuard detection engine with next-generation AI, cloud-native architecture, and
            a modern management experience.
          </p>
          <p className="text-base text-gray-500 mb-8 max-w-2xl mx-auto">
            As the authorized global distributor with full source code access to SkyGuard
            technology, NextGuard is uniquely positioned to deliver the best of both worlds:
            battle-tested DLP policy enforcement enhanced by cutting-edge AI.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-black font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            Request a Demo <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Why Switch Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Why Enterprises Choose NextGuard Over Traditional DLP
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                icon: Brain,
                title: 'AI-First Detection Engine',
                desc: 'Go beyond regex and fingerprinting. NextGuard AI uses Large Language Models to understand document context and intent, reducing false positives by up to 90%.',
              },
              {
                icon: Cloud,
                title: 'Cloud-Native, Not Cloud-Adapted',
                desc: 'Unlike legacy DLP solutions that bolt on cloud features, NextGuard was architected for cloud from day one with native SASE, CASB, and zero-trust capabilities.',
              },
              {
                icon: Zap,
                title: 'Sub-Second Response Latency',
                desc: 'Real-time content inspection and policy enforcement in under 1 second. No lag, no queuing, no missed threats.',
              },
              {
                icon: Shield,
                title: 'Complete SkyGuard Compatibility',
                desc: 'NextGuard is built on SkyGuard core technology with full authorization. Existing SkyGuard policies and rules migrate seamlessly.',
              },
            ].map((item, i) => (
              <div key={i} className="p-6 rounded-xl border border-gray-800 bg-gray-900/50 hover:border-cyan-500/30 transition-colors">
                <item.icon className="w-8 h-8 text-cyan-400 mb-4" />
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-16 px-4 bg-gray-900/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">
            Feature-by-Feature Comparison
          </h2>
          <p className="text-gray-400 text-center mb-12">
            See how NextGuard and SkyGuard DLP compare across key enterprise requirements.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-4 px-4 text-gray-400 font-medium">Feature</th>
                  <th className="text-center py-4 px-4 text-cyan-400 font-semibold">NextGuard</th>
                  <th className="text-center py-4 px-4 text-gray-400 font-medium">SkyGuard</th>
                </tr>
              </thead>
              <tbody>
                {comparisonData.map((row, i) => (
                  <tr key={i} className="border-b border-gray-800 hover:bg-gray-800/30">
                    <td className="py-3 px-4">
                      <div className="text-sm font-medium">{row.feature}</div>
                      {row.note && <div className="text-xs text-gray-500 mt-1">{row.note}</div>}
                    </td>
                    <td className="py-3 px-4 text-center"><StatusIcon status={row.nextguard} /></td>
                    <td className="py-3 px-4 text-center"><StatusIcon status={row.skyguard} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-6 mt-6 text-sm text-gray-500 justify-center">
            <span className="flex items-center gap-1"><CheckCircle className="w-4 h-4 text-green-400" /> Full Support</span>
            <span className="flex items-center gap-1"><Minus className="w-4 h-4 text-yellow-400" /> Partial</span>
            <span className="flex items-center gap-1"><XCircle className="w-4 h-4 text-red-400" /> Not Available</span>
          </div>
        </div>
      </section>

      {/* Migration Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">
            Seamless Migration from SkyGuard to NextGuard
          </h2>
          <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
            Because NextGuard is built on SkyGuard core technology, migration is straightforward.
            Your existing policies, detection rules, and configurations transfer directly.
          </p>
          <div className="grid md:grid-cols-3 gap-6 text-left">
            {[
              { step: '01', title: 'Assessment', desc: 'We audit your current SkyGuard deployment, policies, and data flows to create a migration plan.' },
              { step: '02', title: 'Migration', desc: 'Policies and rules are exported and imported into the NextGuard platform with AI enhancements applied.' },
              { step: '03', title: 'Go Live', desc: 'Parallel operation period ensures zero disruption. Full cutover with ongoing support and optimization.' },
            ].map((item, i) => (
              <div key={i} className="p-6 rounded-xl border border-gray-800">
                <div className="text-cyan-400 font-mono text-sm mb-2">{item.step}</div>
                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-gray-400 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-cyan-900/10 to-transparent">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Upgrade Your DLP?
          </h2>
          <p className="text-gray-400 mb-8">
            Contact our team for a personalized demo and see how NextGuard can strengthen
            your data security posture with AI-powered protection.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-black font-semibold px-8 py-3 rounded-lg transition-colors"
            >
              Schedule a Demo <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/products"
              className="inline-flex items-center justify-center gap-2 border border-gray-600 hover:border-cyan-500 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
            >
              View All Products
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
