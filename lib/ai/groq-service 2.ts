
export type Suggestion = {
    item: string;
    reason: string;
    price: number;
};

export async function getUpsellSuggestions(currentOrder: any[]): Promise<Suggestion[]> {
    try {
        const response = await fetch('/api/ai/suggestions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentOrder })
        });

        if (!response.ok) throw new Error('API Error');

        const data = await response.json();

        // 🔍 DEBUG COMPLETO
        console.log('✅ [Client] Full Response:', data);
        console.log('✅ [Client] Suggestions Array:', data.suggestions);
        console.log('✅ [Client] Is Array?', Array.isArray(data.suggestions));

        return data.suggestions || [];
    } catch (error) {
        console.error('❌ [Client] Error fetching suggestions:', error);
        return [];
    }
}

export async function predictPrepTime(items: any[]): Promise<number> {
    try {
        const response = await fetch('/api/ai/prep-time', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items })
        });

        if (!response.ok) throw new Error('API Error');

        const data = await response.json();
        console.log('✅ [Client] Prep Time:', data);

        return data.time || 15;
    } catch (error) {
        console.error('❌ [Client] Error fetching prep time:', error);
        return 15;
    }
}
