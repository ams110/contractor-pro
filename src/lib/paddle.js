import { initializePaddle } from '@paddle/paddle-js'

// ─── Singleton paddle instance ────────────────────────────────────────────────
let _paddle = null
let _initPromise = null

/**
 * Returns the initialized Paddle instance.
 * Safe to call multiple times — only initializes once.
 */
export async function getPaddle() {
  if (_paddle) return _paddle
  if (_initPromise) return _initPromise

  _initPromise = initializePaddle({
    environment: import.meta.env.VITE_PADDLE_ENVIRONMENT || 'sandbox',
    token: import.meta.env.VITE_PADDLE_CLIENT_TOKEN || '',
  }).then(instance => {
    _paddle = instance
    return instance
  })

  return _initPromise
}

// ─── Plan → Paddle price ID (set via Vite env vars) ──────────────────────────
export const PLAN_PRICES = {
  starter:  import.meta.env.VITE_PADDLE_PRICE_STARTER  || '',
  pro:      import.meta.env.VITE_PADDLE_PRICE_PRO       || '',
  business: import.meta.env.VITE_PADDLE_PRICE_BUSINESS  || '',
}

export const PLAN_META = {
  starter: {
    name:       'Starter',
    nameAr:     'المبتدئ',
    price:      129,
    currency:   '₪',
    period:     'شهر',
    features:   ['مشاريع غير محدودة', 'حتى 10 عمال', 'التقارير الأساسية', 'دعم بريد إلكتروني'],
  },
  pro: {
    name:       'Pro',
    nameAr:     'المحترف',
    price:      249,
    currency:   '₪',
    period:     'شهر',
    features:   ['كل مزايا Starter', 'عمال غير محدودون', 'تقارير متقدمة + PDF', 'دعم أعضاء الفريق', 'استرداد ضريبة القيمة المضافة'],
    popular:    true,
  },
  business: {
    name:       'Business',
    nameAr:     'الأعمال',
    price:      499,
    currency:   '₪',
    period:     'شهر',
    features:   ['كل مزايا Pro', 'مشاريع غير محدودة', 'API access', 'مدير حساب مخصص', 'تكاملات مخصصة'],
  },
}

// ─── Open Paddle overlay checkout ────────────────────────────────────────────
/**
 * Opens the Paddle Billing checkout overlay for a given plan.
 *
 * @param {object} opts
 * @param {'starter'|'pro'|'business'} opts.plan
 * @param {{ id: string, email: string }} opts.user  - Supabase auth user
 * @param {{ id: string }} opts.org                  - organization from useOrganization
 */
export async function openCheckout({ plan, user, org }) {
  const paddle  = await getPaddle()
  const priceId = PLAN_PRICES[plan]

  if (!paddle) throw new Error('Paddle failed to initialize')
  if (!priceId) throw new Error(`No Paddle price configured for plan "${plan}". Set VITE_PADDLE_PRICE_${plan.toUpperCase()} in your .env`)

  paddle.Checkout.open({
    items: [{ priceId, quantity: 1 }],
    customer: { email: user.email },
    customData: {
      user_id: user.id,
      org_id:  org.id,
      plan,
    },
    settings: {
      displayMode: 'overlay',
      theme:       'dark',
      locale:      'en',
    },
  })
}

// ─── Open Paddle customer portal (manage/cancel) ─────────────────────────────
/**
 * Opens the Paddle customer portal so users can manage / cancel their subscription.
 * Requires a transaction ID from the active subscription.
 */
export async function openCustomerPortal(paddleSubscriptionId) {
  const paddle = await getPaddle()
  if (!paddle) return
  // Paddle Billing v2 uses the subscription management URL
  // We redirect the user to the Paddle-hosted portal
  paddle.Retain?.initCancellationFlow?.({ subscriptionId: paddleSubscriptionId })
}
