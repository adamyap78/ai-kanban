import { cardService } from './card.service';
import { listService } from './list.service';
import { boardService } from './board.service';
import { db } from '../utils/db';
import { users } from '../db/schema';

/**
 * AI Agent Tools for Kanban Board Operations
 * Simple wrappers around existing services for AI agent use
 */

let AGENT_USER_ID: string | null = null;

async function getAgentUserId(): Promise<string> {
  if (AGENT_USER_ID) return AGENT_USER_ID;
  
  // Get first available user as the agent user
  const firstUser = await db.select({ id: users.id }).from(users).limit(1);
  if (firstUser.length === 0) {
    throw new Error('No users found in database - create a user first');
  }
  
  AGENT_USER_ID = firstUser[0]!.id;
  console.log('🤖 Using user ID for agent operations:', AGENT_USER_ID);
  return AGENT_USER_ID;
}

export class AgentTools {
  
  // === CARD OPERATIONS ===
  
  /**
   * Create a new card in a specific list
   */
  async createCard(data: {
    title: string;
    description?: string;
    listId: string;
    dueDate?: string; // ISO string
  }) {
    try {
      const userId = await getAgentUserId();
      const card = await cardService.create({
        title: data.title,
        description: data.description,
        listId: data.listId,
        userId: userId,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      });
      
      return {
        success: true,
        card: {
          id: card.id,
          title: card.title,
          description: card.description,
          listId: card.listId,
          dueDate: card.dueDate?.toISOString(),
          createdAt: card.createdAt.toISOString(),
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create card'
      };
    }
  }

  /**
   * Get card by ID
   */
  async getCard(cardId: string) {
    try {
      const userId = await getAgentUserId();
      const card = await cardService.getById(cardId, userId);
      
      if (!card) {
        return {
          success: false,
          error: 'Card not found'
        };
      }
      
      return {
        success: true,
        card: {
          id: card.id,
          title: card.title,
          description: card.description,
          listId: card.listId,
          dueDate: card.dueDate?.toISOString(),
          createdAt: card.createdAt.toISOString(),
          updatedAt: card.updatedAt.toISOString(),
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get card'
      };
    }
  }

  /**
   * Update an existing card
   */
  async updateCard(cardId: string, data: {
    title?: string;
    description?: string;
    dueDate?: string | null; // ISO string or null
  }) {
    try {
      const userId = await getAgentUserId();
      const card = await cardService.update(cardId, userId, {
        title: data.title,
        description: data.description,
        dueDate: data.dueDate === null ? null : 
                 data.dueDate ? new Date(data.dueDate) : undefined,
      });
      
      return {
        success: true,
        card: {
          id: card.id,
          title: card.title,
          description: card.description,
          listId: card.listId,
          dueDate: card.dueDate?.toISOString(),
          updatedAt: card.updatedAt.toISOString(),
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update card'
      };
    }
  }

  /**
   * Move a card to a different list
   */
  async moveCard(cardId: string, data: {
    listId: string;
    position?: number;
  }) {
    try {
      // If no position specified, add to end
      let position = data.position ?? 1000;
      
      const userId = await getAgentUserId();
      await cardService.move(cardId, userId, {
        listId: data.listId,
        position: position,
      });
      
      return {
        success: true,
        message: 'Card moved successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to move card'
      };
    }
  }

  /**
   * Delete a card
   */
  async deleteCard(cardId: string) {
    try {
      const userId = await getAgentUserId();
      await cardService.delete(cardId, userId);
      
      return {
        success: true,
        message: 'Card deleted successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete card'
      };
    }
  }

  /**
   * Get all cards in a specific list
   */
  async getCardsByList(listId: string) {
    try {
      const userId = await getAgentUserId();
      const cards = await cardService.getByList(listId, userId);
      
      return {
        success: true,
        cards: cards.map(card => ({
          id: card.id,
          title: card.title,
          description: card.description,
          listId: card.listId,
          dueDate: card.dueDate?.toISOString(),
          position: card.position,
        }))
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get cards'
      };
    }
  }

  // === LIST OPERATIONS ===

  /**
   * Create a new list in a board
   */
  async createList(data: {
    name: string;
    boardId: string;
  }) {
    try {
      const userId = await getAgentUserId();
      const list = await listService.create({
        name: data.name,
        boardId: data.boardId,
        userId: userId,
      });
      
      return {
        success: true,
        list: {
          id: list.id,
          name: list.name,
          boardId: list.boardId,
          position: list.position,
          createdAt: list.createdAt.toISOString(),
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create list'
      };
    }
  }

  /**
   * Update a list name
   */
  async updateList(listId: string, data: {
    name: string;
  }) {
    try {
      const userId = await getAgentUserId();
      const list = await listService.update(listId, userId, {
        name: data.name,
      });
      
      return {
        success: true,
        list: {
          id: list.id,
          name: list.name,
          boardId: list.boardId,
          updatedAt: list.updatedAt.toISOString(),
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update list'
      };
    }
  }

  /**
   * Delete a list (and all its cards)
   */
  async deleteList(listId: string) {
    try {
      const userId = await getAgentUserId();
      await listService.delete(listId, userId);
      
      return {
        success: true,
        message: 'List deleted successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete list'
      };
    }
  }

  /**
   * Get all lists in a board
   */
  async getListsByBoard(boardId: string) {
    try {
      const userId = await getAgentUserId();
      const lists = await listService.getByBoard(boardId, userId);
      
      return {
        success: true,
        lists: lists.map(list => ({
          id: list.id,
          name: list.name,
          boardId: list.boardId,
          position: list.position,
        }))
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get lists'
      };
    }
  }

  // === BOARD OPERATIONS ===

  /**
   * Get board with all lists and cards
   */
  async getBoardOverview(boardId: string) {
    try {
      const userId = await getAgentUserId();
      const [board, lists, cardsByList] = await Promise.all([
        boardService.getById(boardId, userId),
        listService.getByBoard(boardId, userId),
        cardService.getByBoard(boardId, userId)
      ]);

      if (!board) {
        return {
          success: false,
          error: 'Board not found'
        };
      }

      return {
        success: true,
        board: {
          id: board.id,
          name: board.name,
          description: board.description,
          lists: lists.map(list => ({
            id: list.id,
            name: list.name,
            position: list.position,
            cards: (cardsByList[list.id] || []).map(card => ({
              id: card.id,
              title: card.title,
              description: card.description,
              dueDate: card.dueDate?.toISOString(),
              position: card.position,
            }))
          }))
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get board overview'
      };
    }
  }
}

export const agentTools = new AgentTools();