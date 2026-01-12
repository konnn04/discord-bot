const API_URL = ""; // Proxy handles prefix or we can use /api

export const api = {
    async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const token = localStorage.getItem("token");
        
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
            ...(options.headers as Record<string, string>),
        };

        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        const res = await fetch(`${API_URL}/api${endpoint}`, {
            ...options,
            headers,
        });

        if (!res.ok) {
            if (res.status === 401) {
                // Redirect to login if 401?
                // window.location.href = '/'; 
            }
            const error = await res.json().catch(() => ({ error: res.statusText }));
            throw error;
        }

        // Return empty if 204
        if (res.status === 204) return {} as T;

        return res.json();
    },

    async post<T, B = unknown>(endpoint: string, body: B): Promise<T> {
        return this.fetch<T>(endpoint, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    },

    async patch<T, B = unknown>(endpoint: string, body: B): Promise<T> {
        return this.fetch<T>(endpoint, {
            method: 'PATCH',
            body: JSON.stringify(body)
        });
    },

    async delete<T>(endpoint: string): Promise<T> {
        return this.fetch<T>(endpoint, { method: 'DELETE' });
    }
};
