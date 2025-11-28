'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface Context {
  id: string;
  type: 'text' | 'file';
  content: string;
  fullContent?: string;
  fileUrl?: string;
  fileName?: string;
  order: number;
}

export default function EditRoutePage() {
  const router = useRouter();
  const params = useParams();
  const routeId = params.id as string;

  const [contexts, setContexts] = useState<Context[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [routeName, setRouteName] = useState('');
  const [description, setDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');

  // Context form state
  const [newContextText, setNewContextText] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);

  const loadRouteData = useCallback(async () => {
    const apiKey = localStorage.getItem('apiKey');
    if (!apiKey) {
      router.push('/admin');
      return;
    }

    setLoading(true);
    try {
      // Load route details
      const routeResponse = await fetch(`/api/admin/routes/${routeId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (!routeResponse.ok) throw new Error('Failed to load route');

      const routeData = await routeResponse.json();
      setRouteName(routeData.route.routeName);
      setDescription(routeData.route.description);
      setSystemPrompt(routeData.route.systemPrompt);

      // Load contexts
      const contextsResponse = await fetch(
        `/api/admin/routes/${routeId}/context`,
        {
          headers: { Authorization: `Bearer ${apiKey}` },
        }
      );

      if (!contextsResponse.ok) throw new Error('Failed to load contexts');

      const contextsData = await contextsResponse.json();
      setContexts(contextsData.contexts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load route data');
    } finally {
      setLoading(false);
    }
  }, [routeId, router]);

  useEffect(() => {
    loadRouteData();
  }, [loadRouteData]);

  const handleUpdateRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    const apiKey = localStorage.getItem('apiKey');
    if (!apiKey) return;

    setSaving(true);
    setError('');

    try {
      const response = await fetch(`/api/admin/routes/${routeId}`, {
        method: 'PUT',
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
        throw new Error(data.error || 'Failed to update route');
      }

      await loadRouteData();
      alert('Route updated successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update route');
    } finally {
      setSaving(false);
    }
  };

  const handleAddTextContext = async () => {
    if (!newContextText.trim()) return;

    const apiKey = localStorage.getItem('apiKey');
    if (!apiKey) return;

    try {
      const response = await fetch(`/api/admin/routes/${routeId}/context`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          type: 'text',
          content: newContextText,
        }),
      });

      if (!response.ok) throw new Error('Failed to add context');

      setNewContextText('');
      await loadRouteData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add context');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const apiKey = localStorage.getItem('apiKey');
    if (!apiKey) return;

    setUploadingFile(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'file');

      const response = await fetch(`/api/admin/routes/${routeId}/context`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to upload file');
      }

      await loadRouteData();
      // Reset file input
      e.target.value = '';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDeleteContext = async (contextId: string) => {
    if (!confirm('Are you sure you want to delete this context?')) return;

    const apiKey = localStorage.getItem('apiKey');
    if (!apiKey) return;

    try {
      const response = await fetch(
        `/api/admin/routes/${routeId}/context/${contextId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${apiKey}` },
        }
      );

      if (!response.ok) throw new Error('Failed to delete context');

      await loadRouteData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete context');
    }
  };

  if (loading) {
    return (
      <div className="h-[calc(100vh-3.5rem)] bg-background p-4 md:p-8 overflow-auto">
        <div className="max-w-4xl mx-auto">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] bg-background p-4 md:p-8 overflow-auto">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <Button
            variant="outline"
            onClick={() => router.push('/admin')}
            className="mb-4"
          >
            ← Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold">Edit Route</h1>
          <p className="text-muted-foreground">
            Manage route settings and contexts
          </p>
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Route Settings */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle>Route Settings</CardTitle>
            <CardDescription>Update route configuration</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateRoute} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="routeName">Route Name</Label>
                <Input
                  id="routeName"
                  value={routeName}
                  onChange={(e) => setRouteName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="systemPrompt">System Prompt</Label>
                <Textarea
                  id="systemPrompt"
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  rows={4}
                  className="font-mono text-sm"
                />
              </div>

              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Add Context */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle>Add Context</CardTitle>
            <CardDescription>
              Add text or upload files to provide context for your AI
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Text Context */}
            <div className="space-y-2">
              <Label>Add Text Context</Label>
              <Textarea
                placeholder="Enter context information..."
                value={newContextText}
                onChange={(e) => setNewContextText(e.target.value)}
                rows={4}
              />
              <Button
                onClick={handleAddTextContext}
                disabled={!newContextText.trim()}
              >
                Add Text Context
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or
                </span>
              </div>
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label>Upload File (PDF, TXT, MD)</Label>
              <Input
                type="file"
                accept=".pdf,.txt,.md"
                onChange={handleFileUpload}
                disabled={uploadingFile}
              />
              {uploadingFile && <p className="text-sm">Uploading...</p>}
            </div>
          </CardContent>
        </Card>

        {/* Contexts List */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle>Contexts ({contexts.length})</CardTitle>
            <CardDescription>
              All contexts will be included in the AI&apos;s knowledge base
            </CardDescription>
          </CardHeader>
          <CardContent>
            {contexts.length === 0 ? (
              <p className="text-muted-foreground">
                No contexts yet. Add some above!
              </p>
            ) : (
              <div className="space-y-4">
                {contexts.map((ctx) => (
                  <div
                    key={ctx.id}
                    className="border rounded-lg p-4 space-y-2"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-muted px-2 py-1 rounded">
                            {ctx.type}
                          </span>
                          {ctx.fileName && (
                            <span className="text-sm font-medium">
                              {ctx.fileName}
                            </span>
                          )}
                        </div>
                        <p className="text-sm mt-2 text-muted-foreground">
                          {ctx.content}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteContext(ctx.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
