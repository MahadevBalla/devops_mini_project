# Impact Model

## Table of Contents

- [1. Overview](#1-overview)
- [2. Key Assumptions](#2-key-assumptions)
- [3. Impact Areas](#3-impact-areas)
- [4. Per-User Annual Impact](#4-per-user-annual-impact)
- [5. Scale Impact](#5-scale-impact)
- [6. Non-Quantifiable Impact](#6-non-quantifiable-impact)
- [7. Limitations](#7-limitations)

## 1. Overview

This is a rough impact model for AI Money Mentor.

The point is not precision. It is a simple way to think about what the product might save or improve for a typical salaried retail user in India if they use it regularly for planning, tax checks, and portfolio decisions.

## 2. Key Assumptions

- Typical user is salaried and earns `₹10L-₹18L` per year
- A basic advisor or planner relationship costs roughly `₹15,000-₹25,000` per year
- Many users either do no structured tax planning or leave some deductions/investment choices suboptimal
- A realistic missed tax-saving opportunity for this segment is around `₹8,000-₹15,000` per year
- A realistic investable portfolio for an active user is around `₹3L-₹8L`
- Better allocation, lower overlap, or fewer bad decisions might improve annual portfolio outcome by `1%` in a reasonable case
- Manual planning, calculator work, and reading finance content takes around `5-10` hours per year for a user who is trying to stay on top of things
- With the product, that drops to roughly `1-2` hours per year for the same workflows

## 3. Impact Areas

### A. Cost Savings

If the product replaces some advisor usage, the direct savings are straightforward.

Assumption:

- Traditional advisor or planner cost: `₹20,000/year`
- AI tool cost to user: `₹0-₹5,000/year`

Back-of-the-envelope:

```text
Savings per user = ₹20,000 - ₹5,000
                 = ₹15,000/year
```

Conservative version:

```text
If tool cost is near zero, savings can be closer to ₹20,000/year
```

For the rest of this doc, use:

```text
Advisory savings ≈ ₹15,000-₹20,000/year
```

### B. Tax Optimization Gains

For salaried users, the simplest value comes from checking regime choice and not missing common deduction opportunities where relevant.

Assumption:

- Missed tax-saving opportunity: `₹10,000/year`

Back-of-the-envelope:

```text
Tax saved per user ≈ ₹10,000/year
```

This is deliberately modest. Some users will get almost nothing. Some will do much better if they are currently not planning taxes at all.

### C. Investment Efficiency

This is the hardest part to estimate, so keep it simple.

Assumption:

- Typical tracked portfolio: `₹5,00,000`
- Outcome improvement from better allocation / lower overlap / fewer bad decisions: `1%`

Back-of-the-envelope:

```text
Annual gain = ₹5,00,000 × 1%
            = ₹5,000/year
```

If the user has a larger portfolio or uses the tool consistently, this number can be higher. If they barely invest, it can be close to zero.

### D. Time Saved

Users usually patch together financial planning from spreadsheets, calculators, YouTube, blogs, and occasional advisor calls.

Assumption:

- Current effort: `5-10 hours/year`
- With tool: `1-2 hours/year`

Back-of-the-envelope:

```text
Time saved ≈ 4-8 hours/year
```

If we want to put a notional value on that time:

```text
At ₹500/hour, 4-8 hours saved = ₹2,000-₹4,000/year of time value
```

That is optional. The raw time number is cleaner.

## 4. Per-User Annual Impact

Using the midpoint assumptions:

```text
Advisory savings   ≈ ₹15,000
Tax savings        ≈ ₹10,000
Investment gains   ≈ ₹5,000

Total              ≈ ₹30,000/year per user
```

If we use the slightly more optimistic advisor-replacement number:

```text
Advisory savings   ≈ ₹20,000
Tax savings        ≈ ₹10,000
Investment gains   ≈ ₹5,000

Total              ≈ ₹35,000/year per user
```

So the reasonable rough range is:

```text
Per-user annual impact ≈ ₹30,000-₹35,000
```

That excludes any explicit value assigned to time saved.

## 5. Scale Impact

Using `₹30,000/year` per user:

```text
1,000 users  -> ₹30,000 × 1,000
             -> ₹3,00,00,000/year
             -> ₹3 Cr/year
```

```text
10,000 users -> ₹30,000 × 10,000
             -> ₹30,00,00,000/year
             -> ₹30 Cr/year
```

Using `₹35,000/year` per user:

```text
10,000 users -> ₹35,000 × 10,000
             -> ₹35,00,00,000/year
             -> ₹35 Cr/year
```

This is not revenue. It is rough user-side economic impact.

## 6. Non-Quantifiable Impact

- Better day-to-day understanding of personal finance
- More consistent investing behavior
- Fewer panic or impulse decisions
- Lower friction for planning around life events
- Less anxiety around taxes, retirement, and portfolio health

## 7. Limitations

- These assumptions are simplified and intentionally rough
- Actual savings vary a lot by income, tax profile, portfolio size, and how often the product is used
- Investment outcomes are uncertain and market-dependent
- Some users would not have paid for an advisor anyway, so advisory replacement can be overstated
- LLM-generated guidance is still a guidance layer, not a substitute for regulated financial advice
- The biggest value may come from behavior change over time, which is hard to model cleanly
