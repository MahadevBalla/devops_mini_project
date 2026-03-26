"""
agents/knowledge.py
Structured India finance facts for FY 2025-26 (AY 2026-27).

Injected into agent system prompts as a ground-truth anchor.
Prevents LLM hallucination on India-specific tax figures, limits, and rules.

UPDATE POLICY:
- Mirror changes from finance/tax_constants.py here after every Budget.
- Keep entries short and atomic — no explanations, no edge cases.
- This is NOT a user-facing document; it is an LLM grounding block.
"""

INDIA_FINANCE_FACTS = """
KEY INDIA FINANCE FACTS (FY 2025-26 / AY 2026-27):

TAX REGIMES — India has TWO regimes; a taxpayer chooses ONE per year. No mixing.

NEW REGIME (default from FY 2023-24):
- Slabs: ₹0–4L: nil | ₹4–8L: 5% | ₹8–12L: 10% | ₹12–16L: 15% | ₹16–20L: 20% | ₹20–24L: 25% | above ₹24L: 30%
- Standard deduction: ₹75,000
- Rebate (87A): zero tax if taxable income ≤ ₹12,00,000 (max rebate ₹60,000)
- Deductions NOT available: 80C / 80D / HRA / NPS 80CCD(1B)
- NPS 80CCD(2) (employer contribution): allowed up to 14% of basic salary

OLD REGIME:
- Slabs: ₹0–2.5L: nil | ₹2.5–5L: 5% | ₹5–10L: 20% | above ₹10L: 30%
- Standard deduction: ₹50,000
- Rebate (87A): zero tax if taxable income ≤ ₹5,00,000 (max rebate ₹12,500)
- Section 80C: ₹1,50,000 | 80D self: ₹25,000 (₹50,000 if senior citizen)
- 80D parents: ₹25,000 (₹50,000 if parents are senior citizens)
- NPS 80CCD(1B): additional ₹50,000 over 80C
- Home loan interest Section 24(b): ₹2,00,000
- HRA exemption: available (metros only — Mumbai, Delhi, Kolkata, Chennai)

SURCHARGE:
- Old regime: 10% (>₹50L) / 15% (>₹1Cr) / 25% (>₹2Cr) / 37% (>₹5Cr)
- New regime: capped at 25% (10% / 15% / 25% tiers same, no 37% band)
- Health & Education Cess: 4% on (tax + surcharge) — both regimes

CAPITAL GAINS (equity):
- LTCG (>12 months, Section 112A): ₹1,25,000 exemption; 12.5% tax beyond
- STCG (≤12 months, Section 111A): 20% flat

INVESTMENT LOCK-INS:
- ELSS: 3 years | PPF: 15 years | NPS: till age 60
- EPF: mandatory coverage threshold ₹15,000/month basic salary; employer + employee 12% each

RULES OF THUMB (use these, never invent alternatives):
- Emergency fund: 6 months of expenses — liquid instruments only (savings a/c, liquid MF)
- Term insurance: 10–15x annual income
- Safe Withdrawal Rate (SWR): 4% globally; 3.5% conservative India assumption
- Equity historical SIP XIRR (Nifty 50 TRI): ~9.5% conservative / ~11.5% base / ~13% optimistic
"""
