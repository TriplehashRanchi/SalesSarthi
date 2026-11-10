// Turns any error into a message written for the PERSON using the CRM, never for a developer.
//   - our own API messages (response.data.message) are already written for users and are kept
//   - network / timeout / session / server problems get a plain explanation and what to do next
//   - err.message is never shown (it says things like "Request failed with status code 500")
// The real error is still logged to the console for whoever debugs it.
const SESSION = 'Your session has expired. Please log in again.';
const OFFLINE = "Can't connect right now. Please check your internet connection and try again.";
const SLOW = 'This is taking longer than expected. Please try again.';
const SERVER = 'Something went wrong on our side. Please try again in a moment.';

export const userMessage = (err, fallback) => {
    if (err?.userMessage) return err.userMessage;
    const res = err?.response;
    const apiText = typeof res?.data?.message === 'string' ? res.data.message.trim() : '';
    const status = res?.status;

    if (err?.message === 'User not authenticated.' || status === 401) return SESSION;
    if (status === 403 && /invalid token|unauthorized|not an admin|not a user/i.test(apiText)) return SESSION;
    if (apiText && !/^internal server error$/i.test(apiText)) return apiText;

    if (err?.code === 'ECONNABORTED' || /timeout/i.test(err?.message || '')) return SLOW;
    if (!res && (err?.code === 'ERR_NETWORK' || /network error|failed to fetch|load failed/i.test(err?.message || '') || (typeof navigator !== 'undefined' && navigator.onLine === false))) return OFFLINE;
    if (status && status >= 500) return fallback || SERVER;
    return fallback || SERVER;
};

// Error whose text is already written for the user.
export class UserError extends Error {
    constructor(userText) {
        super(userText);
        this.userMessage = userText;
    }
}
