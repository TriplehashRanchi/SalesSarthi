// Customer statuses offered in the forms.
export const CUSTOMER_STATUSES = ['Active', 'Inactive', 'Prospect', 'Renewal Due', 'Closed'];

// A saved value matches a known status regardless of case. An older value (e.g. "Lapsed") is kept
// as it is, so opening and saving a customer never changes their status by itself.
export const normalizeCustomerStatus = (v) => {
  const text = String(v ?? '').trim();
  if (!text) return 'Active';
  return CUSTOMER_STATUSES.find((o) => o.toLowerCase() === text.toLowerCase()) || text;
};

// Options for the status dropdown: the standard list, plus the customer's current older value if any.
export const customerStatusOptions = (current) => {
  const value = normalizeCustomerStatus(current);
  return CUSTOMER_STATUSES.includes(value) ? CUSTOMER_STATUSES : [...CUSTOMER_STATUSES, value];
};
