import { eq, and, asc, desc } from 'drizzle-orm';
import { db } from '../utils/db';
import { cards, lists, boards, userOrganizations, users, organizations } from '../db/schema';

export interface Card {
  id: string;
  title: string;
  description?: string | null;
  position: number;
  dueDate?: Date | null;
  listId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  creator?: {
    id: string;
    name: string;
    email: string;
  } | undefined;
}

export class CardService {
  async getByList(listId: string, userId: string): Promise<Card[]> {
    // Verify user has access to the list through board/organization
    const result = await db.select({
      id: cards.id,
      title: cards.title,
      description: cards.description,
      position: cards.position,
      dueDate: cards.dueDate,
      listId: cards.listId,
      createdBy: cards.createdBy,
      createdAt: cards.createdAt,
      updatedAt: cards.updatedAt,
      creatorName: users.name,
      creatorEmail: users.email,
    })
      .from(cards)
      .innerJoin(lists, eq(lists.id, cards.listId))
      .innerJoin(boards, eq(boards.id, lists.boardId))
      .innerJoin(userOrganizations, eq(userOrganizations.organizationId, boards.organizationId))
      .leftJoin(users, eq(users.id, cards.createdBy))
      .where(and(
        eq(cards.listId, listId),
        eq(userOrganizations.userId, userId)
      ))
      .orderBy(asc(cards.position));

    return result.map(card => ({
      id: card.id,
      title: card.title,
      description: card.description,
      position: card.position,
      dueDate: card.dueDate,
      listId: card.listId,
      createdBy: card.createdBy,
      createdAt: card.createdAt!,
      updatedAt: card.updatedAt!,
      creator: card.creatorName ? {
        id: card.createdBy,
        name: card.creatorName,
        email: card.creatorEmail!,
      } : undefined,
    }));
  }

  async getByBoard(boardId: string, userId: string): Promise<Record<string, Card[]>> {
    // Get all lists for the board
    const boardLists = await db.select({
      id: lists.id,
      name: lists.name,
      position: lists.position,
    })
      .from(lists)
      .innerJoin(boards, eq(boards.id, lists.boardId))
      .innerJoin(userOrganizations, eq(userOrganizations.organizationId, boards.organizationId))
      .where(and(
        eq(lists.boardId, boardId),
        eq(userOrganizations.userId, userId)
      ))
      .orderBy(asc(lists.position));

    // Get all cards for all lists
    const allCards = await db.select({
      id: cards.id,
      title: cards.title,
      description: cards.description,
      position: cards.position,
      dueDate: cards.dueDate,
      listId: cards.listId,
      createdBy: cards.createdBy,
      createdAt: cards.createdAt,
      updatedAt: cards.updatedAt,
      creatorName: users.name,
      creatorEmail: users.email,
    })
      .from(cards)
      .innerJoin(lists, eq(lists.id, cards.listId))
      .innerJoin(boards, eq(boards.id, lists.boardId))
      .innerJoin(userOrganizations, eq(userOrganizations.organizationId, boards.organizationId))
      .leftJoin(users, eq(users.id, cards.createdBy))
      .where(and(
        eq(lists.boardId, boardId),
        eq(userOrganizations.userId, userId)
      ))
      .orderBy(asc(cards.position));

    // Group cards by list
    const cardsByList: Record<string, Card[]> = {};
    
    // Initialize all lists with empty arrays
    boardLists.forEach(list => {
      cardsByList[list.id] = [];
    });

    // Populate cards
    allCards.forEach(card => {
      const cardData: Card = {
        id: card.id,
        title: card.title,
        description: card.description,
        position: card.position,
        dueDate: card.dueDate,
        listId: card.listId,
        createdBy: card.createdBy,
        createdAt: card.createdAt!,
        updatedAt: card.updatedAt!,
        creator: card.creatorName ? {
          id: card.createdBy,
          name: card.creatorName,
          email: card.creatorEmail!,
        } : undefined,
      };

      if (cardsByList[card.listId]) {
        cardsByList[card.listId]!.push(cardData);
      }
    });

    return cardsByList;
  }

  async getById(cardId: string, userId: string): Promise<Card | null> {
    const result = await db.select({
      id: cards.id,
      title: cards.title,
      description: cards.description,
      position: cards.position,
      dueDate: cards.dueDate,
      listId: cards.listId,
      createdBy: cards.createdBy,
      createdAt: cards.createdAt,
      updatedAt: cards.updatedAt,
      creatorName: users.name,
      creatorEmail: users.email,
    })
      .from(cards)
      .innerJoin(lists, eq(lists.id, cards.listId))
      .innerJoin(boards, eq(boards.id, lists.boardId))
      .innerJoin(userOrganizations, eq(userOrganizations.organizationId, boards.organizationId))
      .leftJoin(users, eq(users.id, cards.createdBy))
      .where(and(
        eq(cards.id, cardId),
        eq(userOrganizations.userId, userId)
      ))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const card = result[0]!;
    return {
      id: card.id,
      title: card.title,
      description: card.description,
      position: card.position,
      dueDate: card.dueDate,
      listId: card.listId,
      createdBy: card.createdBy,
      createdAt: card.createdAt!,
      updatedAt: card.updatedAt!,
      creator: card.creatorName ? {
        id: card.createdBy,
        name: card.creatorName,
        email: card.creatorEmail!,
      } : undefined,
    };
  }

  async create(data: {
    title: string;
    description?: string | undefined;
    listId: string;
    userId: string;
    position?: number;
    dueDate?: Date | undefined;
  }): Promise<Card> {
    console.log('🃏 Creating card:', data.title, 'in list:', data.listId);

    // Verify user has access to the list
    const listAccess = await db.select()
      .from(lists)
      .innerJoin(boards, eq(boards.id, lists.boardId))
      .innerJoin(userOrganizations, eq(userOrganizations.organizationId, boards.organizationId))
      .where(and(
        eq(lists.id, data.listId),
        eq(userOrganizations.userId, data.userId)
      ))
      .limit(1);

    if (listAccess.length === 0) {
      throw new Error('Access denied to this list');
    }

    // If no position provided, get next position
    let position = data.position;
    if (!position) {
      const lastCard = await db.select({ position: cards.position })
        .from(cards)
        .where(eq(cards.listId, data.listId))
        .orderBy(desc(cards.position))
        .limit(1);
      
      position = lastCard.length > 0 ? lastCard[0]!.position + 1 : 1;
    }

    // Create card
    const newCard = await db.insert(cards).values({
      title: data.title,
      description: data.description || null,
      listId: data.listId,
      position: position,
      dueDate: data.dueDate || null,
      createdBy: data.userId,
    }).returning();

    if (!newCard[0]) {
      throw new Error('Failed to create card');
    }

    const card = newCard[0];
    console.log('✅ Card created:', card.id);

    // Fetch the full card with creator information using getById
    const fullCard = await this.getById(card.id, data.userId);
    if (!fullCard) {
      throw new Error('Failed to retrieve created card');
    }
    
    return fullCard;
  }

  async update(cardId: string, userId: string, data: {
    title?: string | undefined;
    description?: string | undefined;
    dueDate?: Date | null | undefined;
  }): Promise<Card> {
    console.log('📝 Updating card:', cardId);

    // Verify user has access to the card
    const access = await db.select()
      .from(cards)
      .innerJoin(lists, eq(lists.id, cards.listId))
      .innerJoin(boards, eq(boards.id, lists.boardId))
      .innerJoin(userOrganizations, eq(userOrganizations.organizationId, boards.organizationId))
      .where(and(
        eq(cards.id, cardId),
        eq(userOrganizations.userId, userId)
      ))
      .limit(1);

    if (access.length === 0) {
      throw new Error('Card not found or access denied');
    }

    // Update card
    const updateData: any = { updatedAt: new Date() };
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate;

    const updatedCard = await db.update(cards)
      .set(updateData)
      .where(eq(cards.id, cardId))
      .returning();

    if (!updatedCard[0]) {
      throw new Error('Failed to update card');
    }

    const updated = updatedCard[0];
    return {
      id: updated.id,
      title: updated.title,
      description: updated.description,
      position: updated.position,
      dueDate: updated.dueDate,
      listId: updated.listId,
      createdBy: updated.createdBy,
      createdAt: updated.createdAt!,
      updatedAt: updated.updatedAt!,
    };
  }

  async move(cardId: string, userId: string, data: {
    listId: string;
    position: number;
  }): Promise<void> {
    console.log('🔄 Moving card:', cardId, 'to list:', data.listId, 'position:', data.position);

    // Verify user has access to both the card and the target list
    const cardAccess = await db.select()
      .from(cards)
      .innerJoin(lists, eq(lists.id, cards.listId))
      .innerJoin(boards, eq(boards.id, lists.boardId))
      .innerJoin(userOrganizations, eq(userOrganizations.organizationId, boards.organizationId))
      .where(and(
        eq(cards.id, cardId),
        eq(userOrganizations.userId, userId)
      ))
      .limit(1);

    const listAccess = await db.select()
      .from(lists)
      .innerJoin(boards, eq(boards.id, lists.boardId))
      .innerJoin(userOrganizations, eq(userOrganizations.organizationId, boards.organizationId))
      .where(and(
        eq(lists.id, data.listId),
        eq(userOrganizations.userId, userId)
      ))
      .limit(1);

    if (cardAccess.length === 0 || listAccess.length === 0) {
      throw new Error('Card or list not found or access denied');
    }

    // Move card
    await db.update(cards)
      .set({ 
        listId: data.listId,
        position: data.position,
        updatedAt: new Date()
      })
      .where(eq(cards.id, cardId));

    console.log('✅ Card moved');
  }

  async delete(cardId: string, userId: string): Promise<void> {
    console.log('🗑️ Deleting card:', cardId);

    // Verify access
    const access = await db.select()
      .from(cards)
      .innerJoin(lists, eq(lists.id, cards.listId))
      .innerJoin(boards, eq(boards.id, lists.boardId))
      .innerJoin(userOrganizations, eq(userOrganizations.organizationId, boards.organizationId))
      .where(and(
        eq(cards.id, cardId),
        eq(userOrganizations.userId, userId)
      ))
      .limit(1);

    if (access.length === 0) {
      throw new Error('Card not found or access denied');
    }

    // Delete card
    await db.delete(cards).where(eq(cards.id, cardId));

    console.log('✅ Card deleted');
  }

  async getListInfo(listId: string): Promise<{ boardId: string; organizationSlug: string } | null> {
    const result = await db.select({
      boardId: boards.id,
      organizationSlug: organizations.slug,
    })
      .from(lists)
      .innerJoin(boards, eq(boards.id, lists.boardId))
      .innerJoin(organizations, eq(organizations.id, boards.organizationId))
      .where(eq(lists.id, listId))
      .limit(1);

    return result.length > 0 ? result[0]! : null;
  }
}

export const cardService = new CardService();