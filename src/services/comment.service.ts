import { eq, and, desc } from 'drizzle-orm';
import { db } from '../utils/db';
import { cardComments, cards, lists, boards, userOrganizations, users } from '../db/schema';

export interface Comment {
  id: string;
  cardId: string;
  userId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
  };
}

export class CommentService {
  async getByCardId(cardId: string, requestUserId: string): Promise<Comment[]> {
    // Verify user has access to the card through board/organization
    const result = await db.select({
      commentId: cardComments.id,
      cardId: cardComments.cardId,
      userId: cardComments.userId,
      content: cardComments.content,
      createdAt: cardComments.createdAt,
      updatedAt: cardComments.updatedAt,
      userName: users.name,
      userEmail: users.email,
      userAvatarUrl: users.avatarUrl,
    })
      .from(cardComments)
      .innerJoin(cards, eq(cards.id, cardComments.cardId))
      .innerJoin(lists, eq(lists.id, cards.listId))
      .innerJoin(boards, eq(boards.id, lists.boardId))
      .innerJoin(userOrganizations, eq(userOrganizations.organizationId, boards.organizationId))
      .leftJoin(users, eq(users.id, cardComments.userId))
      .where(and(
        eq(cardComments.cardId, cardId),
        eq(userOrganizations.userId, requestUserId)
      ))
      .orderBy(desc(cardComments.createdAt));

    return result.map(row => ({
      id: row.commentId,
      cardId: row.cardId,
      userId: row.userId,
      content: row.content,
      createdAt: row.createdAt!,
      updatedAt: row.updatedAt!,
      user: {
        id: row.userId,
        name: row.userName!,
        email: row.userEmail!,
        avatarUrl: row.userAvatarUrl,
      },
    }));
  }

  async create(data: {
    cardId: string;
    userId: string;
    content: string;
  }): Promise<Comment> {
    console.log('💬 Creating comment for card:', data.cardId);

    // Verify user has access to the card
    const access = await db.select()
      .from(cards)
      .innerJoin(lists, eq(lists.id, cards.listId))
      .innerJoin(boards, eq(boards.id, lists.boardId))
      .innerJoin(userOrganizations, eq(userOrganizations.organizationId, boards.organizationId))
      .where(and(
        eq(cards.id, data.cardId),
        eq(userOrganizations.userId, data.userId)
      ))
      .limit(1);

    if (access.length === 0) {
      throw new Error('Access denied to this card');
    }

    // Create comment
    const newComment = await db.insert(cardComments).values({
      cardId: data.cardId,
      userId: data.userId,
      content: data.content,
    }).returning();

    if (!newComment[0]) {
      throw new Error('Failed to create comment');
    }

    const comment = newComment[0];
    console.log('✅ Comment created:', comment.id);

    // Get user information
    const user = await db.select()
      .from(users)
      .where(eq(users.id, data.userId))
      .limit(1);

    if (!user[0]) {
      throw new Error('User not found');
    }

    return {
      id: comment.id,
      cardId: comment.cardId,
      userId: comment.userId,
      content: comment.content,
      createdAt: comment.createdAt!,
      updatedAt: comment.updatedAt!,
      user: {
        id: user[0].id,
        name: user[0].name,
        email: user[0].email,
        avatarUrl: user[0].avatarUrl,
      },
    };
  }

  async update(commentId: string, requestUserId: string, content: string): Promise<Comment> {
    console.log('📝 Updating comment:', commentId);

    // Verify user has access to the comment (either owns it or has board access)
    const access = await db.select({
      commentUserId: cardComments.userId,
      cardId: cardComments.cardId,
    })
      .from(cardComments)
      .innerJoin(cards, eq(cards.id, cardComments.cardId))
      .innerJoin(lists, eq(lists.id, cards.listId))
      .innerJoin(boards, eq(boards.id, lists.boardId))
      .innerJoin(userOrganizations, eq(userOrganizations.organizationId, boards.organizationId))
      .where(and(
        eq(cardComments.id, commentId),
        eq(userOrganizations.userId, requestUserId)
      ))
      .limit(1);

    if (access.length === 0) {
      throw new Error('Comment not found or access denied');
    }

    const comment = access[0]!;
    
    // Only allow the comment owner to edit their own comment
    if (comment.commentUserId !== requestUserId) {
      throw new Error('You can only edit your own comments');
    }

    // Update comment
    const updatedComment = await db.update(cardComments)
      .set({ 
        content,
        updatedAt: new Date()
      })
      .where(eq(cardComments.id, commentId))
      .returning();

    if (!updatedComment[0]) {
      throw new Error('Failed to update comment');
    }

    // Get user information
    const user = await db.select()
      .from(users)
      .where(eq(users.id, requestUserId))
      .limit(1);

    if (!user[0]) {
      throw new Error('User not found');
    }

    const updated = updatedComment[0];
    return {
      id: updated.id,
      cardId: updated.cardId,
      userId: updated.userId,
      content: updated.content,
      createdAt: updated.createdAt!,
      updatedAt: updated.updatedAt!,
      user: {
        id: user[0].id,
        name: user[0].name,
        email: user[0].email,
        avatarUrl: user[0].avatarUrl,
      },
    };
  }

  async delete(commentId: string, requestUserId: string): Promise<void> {
    console.log('🗑️ Deleting comment:', commentId);

    // Verify user has access to the comment (either owns it or has board access)
    const access = await db.select({
      commentUserId: cardComments.userId,
    })
      .from(cardComments)
      .innerJoin(cards, eq(cards.id, cardComments.cardId))
      .innerJoin(lists, eq(lists.id, cards.listId))
      .innerJoin(boards, eq(boards.id, lists.boardId))
      .innerJoin(userOrganizations, eq(userOrganizations.organizationId, boards.organizationId))
      .where(and(
        eq(cardComments.id, commentId),
        eq(userOrganizations.userId, requestUserId)
      ))
      .limit(1);

    if (access.length === 0) {
      throw new Error('Comment not found or access denied');
    }

    const comment = access[0]!;
    
    // Only allow the comment owner to delete their own comment
    if (comment.commentUserId !== requestUserId) {
      throw new Error('You can only delete your own comments');
    }

    // Delete comment
    await db.delete(cardComments).where(eq(cardComments.id, commentId));

    console.log('✅ Comment deleted');
  }
}

export const commentService = new CommentService();