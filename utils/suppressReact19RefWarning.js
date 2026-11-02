// Mantine v5 reads `element.ref`, which React 19 (used by Next 16) warns about in development only.
// It is harmless, so hide just that one message. Everything else still reaches the console.
// Remove this file once Mantine is upgraded to v7.
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development' && !window.__refWarningFiltered) {
    window.__refWarningFiltered = true;
    const original = console.error;
    console.error = (...args) => {
        if (typeof args[0] === 'string' && args[0].includes('Accessing element.ref was removed in React 19')) return;
        original.apply(console, args);
    };
}
