function resolveCsrfToken(providedToken?: string): string {
    if (providedToken) {
        return providedToken;
    }

    return (
        document
            .querySelector('meta[name="csrf-token"]')
            ?.getAttribute('content') ?? ''
    );
}

export async function persistOrder(
    url: string,
    payload: Record<string, unknown>,
    csrfToken?: string,
): Promise<void> {
    const response = await fetch(url, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': resolveCsrfToken(csrfToken),
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        throw new Error(`Order update failed with status ${response.status}.`);
    }
}
