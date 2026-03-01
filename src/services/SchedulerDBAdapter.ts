// @ts-ignore - resolved by Astro build pipeline
import { db, ScheduledPosts, eq } from 'astro:db';
import type { ScheduledPostDBRow } from '../domain/entities/ScheduledPost';
import type { SchedulerDBAdapter } from './SchedulerService';

export class AstroSchedulerDBAdapter implements SchedulerDBAdapter {
  async listAll(): Promise<ScheduledPostDBRow[]> {
    return await db.select().from(ScheduledPosts);
  }

  async getById(id: string): Promise<ScheduledPostDBRow | null> {
    const row = await db
      .select()
      .from(ScheduledPosts)
      .where(eq(ScheduledPosts.id, id))
      .get();
    return row ?? null;
  }

  async insert(row: ScheduledPostDBRow): Promise<void> {
    await db.insert(ScheduledPosts).values({
      id: row.id,
      input: row.input,
      inputType: row.inputType,
      scheduledDate: row.scheduledDate,
      status: row.status,
      generatedTitle: row.generatedTitle ?? undefined,
      generatedDescription: row.generatedDescription ?? undefined,
      generatedContent: row.generatedContent ?? undefined,
      generatedTags: row.generatedTags ?? undefined,
      generatedImageData: row.generatedImageData ?? undefined,
      generatedImageAlt: row.generatedImageAlt ?? undefined,
      publishedPath: row.publishedPath ?? undefined,
      createdAt: row.createdAt,
    });
  }

  async update(id: string, data: Partial<ScheduledPostDBRow>): Promise<void> {
    const updateData: Record<string, unknown> = {};
    if (data.status !== undefined) updateData.status = data.status;
    if (data.generatedTitle !== undefined)
      updateData.generatedTitle = data.generatedTitle;
    if (data.generatedDescription !== undefined)
      updateData.generatedDescription = data.generatedDescription;
    if (data.generatedContent !== undefined)
      updateData.generatedContent = data.generatedContent;
    if (data.generatedTags !== undefined)
      updateData.generatedTags = data.generatedTags;
    if (data.generatedImageData !== undefined)
      updateData.generatedImageData = data.generatedImageData;
    if (data.generatedImageAlt !== undefined)
      updateData.generatedImageAlt = data.generatedImageAlt;
    if (data.publishedPath !== undefined)
      updateData.publishedPath = data.publishedPath;

    await db
      .update(ScheduledPosts)
      .set(updateData)
      .where(eq(ScheduledPosts.id, id));
  }

  async deleteById(id: string): Promise<void> {
    await db.delete(ScheduledPosts).where(eq(ScheduledPosts.id, id));
  }

  async getByDate(date: Date): Promise<ScheduledPostDBRow | null> {
    // Get all rows and filter by date (astro:db doesn't have date comparison operators)
    const all = await db.select().from(ScheduledPosts);
    const dateStr = date.toISOString().split('T')[0];
    const match = all.find((row: ScheduledPostDBRow) => {
      const rowDate = new Date(row.scheduledDate).toISOString().split('T')[0];
      return rowDate === dateStr && row.status !== 'published';
    });
    return match ?? null;
  }
}
