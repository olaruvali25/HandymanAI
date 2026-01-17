"use client";

import { useMutation, useQuery, useConvexAuth } from "convex/react";
import Link from "next/link";
import { useState } from "react";

import { api } from "@convex/_generated/api";
import Container from "@/components/Container";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

export default function TasksPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();

  const me = useQuery(api.users.me);
  const tasks = useQuery(api.tasks.list);
  const createTask = useMutation(api.tasks.create);
  const toggleTask = useMutation(api.tasks.toggle);
  const removeTask = useMutation(api.tasks.remove);

  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isLoading) {
    return (
      <section className="py-16 lg:py-24">
        <Container>
          <div className="text-sm text-[var(--muted)]">Loading session…</div>
        </Container>
      </section>
    );
  }

  if (!isAuthenticated) {
    return (
      <section className="py-16 lg:py-24">
        <Container>
          <Card className="mx-auto max-w-xl bg-[var(--bg-elev)]">
            <CardHeader>
              <CardTitle className="text-white">Tasks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-[var(--muted)]">
                You need to be logged in to view tasks.
              </p>
              <Button asChild>
                <Link href="/login?returnTo=/tasks">Log in</Link>
              </Button>
            </CardContent>
          </Card>
        </Container>
      </section>
    );
  }

  return (
    <section className="py-16 lg:py-24">
      <Container>
        <div className="mx-auto max-w-2xl space-y-6">
          <div>
            <p className="text-xs tracking-[0.2em] text-[var(--accent-soft)] uppercase">
              Demo feature
            </p>
            <h1 className="font-display text-3xl font-semibold text-white sm:text-4xl">
              Tasks
            </h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Signed in as{" "}
              <span className="text-white">
                {me?.email ?? me?.name ?? me?._id ?? "Unknown user"}
              </span>
            </p>
          </div>

          <Card className="bg-[var(--bg-elev)]">
            <CardHeader>
              <CardTitle className="text-white">Add a task</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="flex flex-col gap-3 sm:flex-row"
                onSubmit={async (event) => {
                  event.preventDefault();
                  setError(null);
                  const nextTitle = title.trim();
                  if (!nextTitle) return;

                  setIsSubmitting(true);
                  try {
                    await createTask({ title: nextTitle });
                    setTitle("");
                  } catch (err) {
                    setError(
                      err instanceof Error
                        ? err.message
                        : "Failed to add task.",
                    );
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
              >
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Replace shower head washer"
                />
                <Button type="submit" disabled={isSubmitting}>
                  Add
                </Button>
              </form>

              {error ? (
                <div className="border-border mt-4 rounded-[var(--radius-md)] border bg-black/30 px-4 py-3 text-sm text-[var(--accent-soft)]">
                  {error}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="bg-[var(--bg-elev)]">
            <CardHeader>
              <CardTitle className="text-white">Your tasks</CardTitle>
            </CardHeader>
            <CardContent>
              {!tasks ? (
                <div className="text-sm text-[var(--muted)]">Loading…</div>
              ) : tasks.length === 0 ? (
                <div className="text-sm text-[var(--muted)]">
                  No tasks yet. Add one above.
                </div>
              ) : (
                <ul className="space-y-3">
                  {tasks.map((task) => (
                    <li
                      key={task._id}
                      className="border-border flex items-center gap-3 rounded-[var(--radius-md)] border bg-black/20 px-4 py-3"
                    >
                      <Checkbox
                        checked={task.completed}
                        onCheckedChange={async () => {
                          try {
                            await toggleTask({ taskId: task._id });
                          } catch (err) {
                            setError(
                              err instanceof Error
                                ? err.message
                                : "Failed to toggle task.",
                            );
                          }
                        }}
                        aria-label={`Mark "${task.title}" as ${
                          task.completed ? "incomplete" : "complete"
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <div
                          className={
                            task.completed
                              ? "truncate text-sm text-[var(--muted)] line-through"
                              : "truncate text-sm text-white"
                          }
                        >
                          {task.title}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            await removeTask({ taskId: task._id });
                          } catch (err) {
                            setError(
                              err instanceof Error
                                ? err.message
                                : "Failed to delete task.",
                            );
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </Container>
    </section>
  );
}
