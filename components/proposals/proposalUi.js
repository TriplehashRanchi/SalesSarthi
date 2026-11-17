// Shared formatting and maths for the proposal screens. The totals here are only for the live preview while typing;
// the server works them out again on save (sarthiapi/utils/proposalMath.js).

export const FREQUENCIES = ['Monthly', 'Quarterly', 'Half-yearly', 'Yearly', 'Single'];
const PER_YEAR = { Monthly: 12, Quarterly: 4, 'Half-yearly': 2, Yearly: 1, Single: 0 };
export const PER_LABEL = { Monthly: '/ month', Quarterly: '/ quarter', 'Half-yearly': '/ 6 months', Yearly: '/ year', Single: 'one-time' };

export const STATUS = {
    draft: { label: 'Draft', color: 'gray' },
    shared: { label: 'Shared', color: 'blue' },
    accepted: { label: 'Accepted', color: 'green' },
    rejected: { label: 'Rejected', color: 'red' },
    revised: { label: 'Revised', color: 'violet' },
};

export const SOURCE_LABEL = { fhc: 'Financial Health Check', kundli: 'Financial Kundli' };
export const REJECT_REASONS = ['Budget', 'Will think later', 'Bought elsewhere', 'Other'];

const num = (v) => {
    if (v === '' || v === null || v === undefined) return 0;
    const n = Number(String(v).replace(/,/g, ''));
    return Number.isFinite(n) ? n : 0;
};

export const inr = (v) => `₹${Math.round(num(v)).toLocaleString('en-IN')}`;

// Short Indian format for summary tiles: ₹1.2 Cr, ₹45 L, ₹18,500
export const inrShort = (v) => {
    const n = num(v);
    if (n >= 1e7) return `₹${(n / 1e7).toFixed(n >= 1e8 ? 0 : 2).replace(/\.?0+$/, '')} Cr`;
    if (n >= 1e5) return `₹${(n / 1e5).toFixed(n >= 1e6 ? 1 : 2).replace(/\.?0+$/, '')} L`;
    return inr(n);
};

export const shortDate = (d) => {
    const x = new Date(d);
    return Number.isNaN(x.getTime()) ? '' : x.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

// 'YYYY-MM-DD' + years → 'YYYY-MM-DD'
export const addYears = (date, years) => {
    if (!date || !(num(years) > 0)) return '';
    const [y, m, d] = date.split('-').map(Number);
    if (!y || !m || !d) return '';
    const out = new Date(Date.UTC(y + num(years), m - 1, d));
    if (out.getUTCDate() !== d) out.setUTCDate(0);
    return out.toISOString().slice(0, 10);
};

export const itemMoney = (it) => {
    const amount = num(it.investment_amount);
    if (it.payment_frequency === 'Single') return { yearly: 0, oneTime: amount, payable: amount };
    const yearly = amount * (PER_YEAR[it.payment_frequency] || 0);
    return { yearly, oneTime: 0, payable: num(it.payment_term_years) ? yearly * num(it.payment_term_years) : 0 };
};

export const totals = (items) =>
    items.reduce(
        (t, it) => {
            const m = itemMoney(it);
            return { yearly: t.yearly + m.yearly, oneTime: t.oneTime + m.oneTime, payable: t.payable + m.payable, maturity: t.maturity + num(it.maturity_amount) };
        },
        { yearly: 0, oneTime: 0, payable: 0, maturity: 0 }
    );

let seq = 0;
export const newKey = () => `k${Date.now().toString(36)}${(seq += 1)}`;

export const emptyItem = () => ({
    _key: newKey(),
    company_name: '',
    product_name: '',
    payment_term_years: '',
    payment_frequency: 'Yearly',
    plan_term_years: '',
    investment_amount: '',
    additional_features: '',
    plan_start_date: '',
    plan_end_date: '',
    maturity_amount: '',
    reason: '',
    suggestion_key: null,
});

export const itemFromSuggestion = (s) => ({
    ...emptyItem(),
    product_name: s.product,
    reason: s.reason,
    suggestion_key: s.key,
    investment_amount: s.investment_amount ?? '',
    payment_frequency: s.payment_frequency || 'Yearly',
    payment_term_years: s.payment_term_years ?? '',
    plan_term_years: s.plan_term_years ?? '',
});

// Saved item → editable form values (nulls as ''). endAuto: the end date still follows start + plan term.
export const itemToForm = (it) => {
    const out = { ...emptyItem() };
    Object.keys(out).forEach((k) => {
        if (k !== '_key' && it[k] !== null && it[k] !== undefined) out[k] = it[k];
    });
    out.endAuto = !out.plan_end_date || out.plan_end_date === addYears(out.plan_start_date, out.plan_term_years);
    return out;
};

// Form values → what the API expects ('' → null). The server checks and works out the rest.
export const itemToApi = ({ _key, endAuto, ...it }) => {
    const out = {};
    Object.entries(it).forEach(([k, v]) => {
        out[k] = v === '' ? null : v;
    });
    ['company_name', 'product_name', 'additional_features', 'reason'].forEach((k) => {
        out[k] = it[k] || '';
    });
    out.payment_frequency = it.payment_frequency || 'Yearly';
    return out;
};

export const saveBlob = (blob, fileName) => {
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
};
