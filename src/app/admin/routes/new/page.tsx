'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export default function NewRoutePage() {
  const router = useRouter();
  const [routeName, setRouteName] = useState('');
  const [description, setDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const apiKey = localStorage.getItem('apiKey');
    if (!apiKey) {
      setError('Not authenticated. Please login first.');
      setLoading(false);
      router.push('/admin');
      return;
    }

    try {
      const response = await fetch('/api/admin/routes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          routeName,
          description,
          systemPrompt,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create route');
      }

      const data = await response.json();
      router.push(`/admin/routes/${data.route.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create route');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <Button
            variant="outline"
            onClick={() => router.push('/admin')}
            className="mb-4"
          >
            ← Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold">Create New Route</h1>
          <p className="text-muted-foreground">
            Create a custom AI endpoint with its own context
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Route Configuration</CardTitle>
            <CardDescription>
              Define your custom route name and behavior
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="routeName">Route Name *</Label>
                <Input
                  id="routeName"
                  placeholder="customer-support"
                  value={routeName}
                  onChange={(e) => setRouteName(e.target.value)}
                  required
                  pattern="[a-zA-Z0-9_-]+"
                  title="Only letters, numbers, hyphens, and underscores allowed"
                />
                <p className="text-xs text-muted-foreground">
                  This will be your endpoint: /api/chats/{routeName || '<route-name>'}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="AI assistant for customer support"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Optional: Describe what this route is for
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="systemPrompt">System Prompt</Label>
                <Textarea
                  id="systemPrompt"
                  placeholder="You are a helpful customer support assistant. Be polite and professional..."
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  rows={6}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Optional: Define the AI&apos;s behavior. You can add context later.
                </p>
              </div>

              {error && (
                <div className="bg-destructive/10 text-destructive px-4 py-3 rounded">
                  {error}
                </div>
              )}

              <div className="flex gap-2">
                <Button type="submit" disabled={loading || !routeName}>
                  {loading ? 'Creating...' : 'Create Route'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/admin')}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
