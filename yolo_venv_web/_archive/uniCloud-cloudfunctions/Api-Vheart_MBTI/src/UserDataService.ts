/**
 * @Description: 
 * 用户数据服务 - 处理用户历史记录和收藏的云存储
 * @author liuzhiheng
 * @createTime: 2026-05-16 15:00:00
 */
declare var uniCloud : any;
import BaseService from "./BaseService";
import { IApiResult } from "./interface";

export interface HistoryItem {
  id: string;
  type: string;
  result: any;
  answers: string[];
  createTime: number;
}

export interface FavoriteItem {
  type: string;
  vocabulary: string;
  occupation: string;
  fullData: any;
  createTime: number;
}

export interface UserData {
  user_id: string;
  history: HistoryItem[];
  favorites: FavoriteItem[];
  updated_at: number;
}

export interface SyncRequest {
  user_id: string;
  local_history?: HistoryItem[];
  local_favorites?: FavoriteItem[];
  local_updated_at?: number;
}

export interface SyncResponse {
  cloud_history: HistoryItem[];
  cloud_favorites: FavoriteItem[];
  cloud_updated_at: number;
}

export class UserDataService extends BaseService {
  
  async getUserData(user_id: string): Promise<IApiResult<UserData>> {
    try {
      const db = uniCloud.database();
      const result = await db.collection('mbti_user_data')
        .where({ user_id })
        .get();
      
      if (result.data && result.data.length > 0) {
        return this.success(result.data[0]);
      } else {
        return this.success(null);
      }
    } catch (error: any) {
      console.error('获取用户数据失败:', error);
      return this.fail('获取用户数据失败');
    }
  }
  
  async saveUserData(user_id: string, history: HistoryItem[], favorites: FavoriteItem[]): Promise<IApiResult<any>> {
    try {
      const db = uniCloud.database();
      const now = Date.now();
      
      const exists = await db.collection('mbti_user_data')
        .where({ user_id })
        .count();
      
      if (exists.total > 0) {
        await db.collection('mbti_user_data')
          .where({ user_id })
          .update({
            history,
            favorites,
            updated_at: now
          });
        console.log('用户数据更新成功:', user_id);
      } else {
        await db.collection('mbti_user_data').add({
          user_id,
          history,
          favorites,
          updated_at: now,
          created_at: now
        });
        console.log('用户数据创建成功:', user_id);
      }
      
      return this.success({ success: true });
    } catch (error: any) {
      console.error('保存用户数据失败:', error);
      return this.fail('保存用户数据失败');
    }
  }
  
  async syncUserData(params: SyncRequest): Promise<IApiResult<SyncResponse>> {
    try {
      const { user_id, local_history = [], local_favorites = [], local_updated_at = 0 } = params;
      
      const db = uniCloud.database();
      const result = await db.collection('mbti_user_data')
        .where({ user_id })
        .get();
      
      let cloud_history: HistoryItem[] = [];
      let cloud_favorites: FavoriteItem[] = [];
      let cloud_updated_at = 0;
      
      if (result.data && result.data.length > 0) {
        const userData = result.data[0];
        cloud_history = userData.history || [];
        cloud_favorites = userData.favorites || [];
        cloud_updated_at = userData.updated_at || 0;
      }
      
      if (cloud_updated_at === 0 && local_updated_at === 0) {
        if (local_history.length > 0 || local_favorites.length > 0) {
          await this.saveUserData(user_id, local_history, local_favorites);
        }
        return this.success({
          cloud_history: local_history,
          cloud_favorites: local_favorites,
          cloud_updated_at: Date.now()
        });
      }
      
      if (local_updated_at >= cloud_updated_at) {
        const mergedHistory = this.mergeHistory(local_history, cloud_history);
        const mergedFavorites = this.mergeFavorites(local_favorites, cloud_favorites);
        
        await this.saveUserData(user_id, mergedHistory, mergedFavorites);
        
        return this.success({
          cloud_history: mergedHistory,
          cloud_favorites: mergedFavorites,
          cloud_updated_at: Date.now()
        });
      } else {
        return this.success({
          cloud_history,
          cloud_favorites,
          cloud_updated_at
        });
      }
      
    } catch (error: any) {
      console.error('同步用户数据失败:', error);
      return this.fail('同步用户数据失败');
    }
  }
  
  private mergeHistory(local: HistoryItem[], cloud: HistoryItem[]): HistoryItem[] {
    const merged = [...cloud];
    const cloudIds = new Set(cloud.map(item => item.id));
    
    for (const item of local) {
      if (!cloudIds.has(item.id)) {
        merged.push(item);
      }
    }
    
    merged.sort((a, b) => b.createTime - a.createTime);
    return merged;
  }
  
  private mergeFavorites(local: FavoriteItem[], cloud: FavoriteItem[]): FavoriteItem[] {
    const merged = [...cloud];
    const cloudTypes = new Set(cloud.map(item => item.type));
    
    for (const item of local) {
      if (!cloudTypes.has(item.type)) {
        merged.push(item);
      }
    }
    
    merged.sort((a, b) => b.createTime - a.createTime);
    return merged;
  }
  
  async deleteUserData(user_id: string): Promise<IApiResult<any>> {
    try {
      const db = uniCloud.database();
      await db.collection('mbti_user_data')
        .where({ user_id })
        .remove();
      
      return this.success({ success: true });
    } catch (error: any) {
      console.error('删除用户数据失败:', error);
      return this.fail('删除用户数据失败');
    }
  }

  async syncAll(user_id: string): Promise<IApiResult<any>> {
    try {
      const db = uniCloud.database();
      const result = await db.collection('mbti_user_data')
        .where({ user_id })
        .get();
      
      if (result.data && result.data.length > 0) {
        const userData = result.data[0];
        return this.success({
          history: userData.history || [],
          favorites: userData.favorites || []
        });
      }
      
      return this.success({
        history: [],
        favorites: []
      });
    } catch (error: any) {
      console.error('同步数据失败:', error);
      return this.fail('同步数据失败');
    }
  }

  async saveHistory(user_id: string, history: HistoryItem[]): Promise<IApiResult<any>> {
    try {
      const db = uniCloud.database();
      const now = Date.now();
      
      const exists = await db.collection('mbti_user_data')
        .where({ user_id })
        .count();
      
      if (exists.total > 0) {
        await db.collection('mbti_user_data')
          .where({ user_id })
          .update({
            history,
            updated_at: now
          });
      } else {
        await db.collection('mbti_user_data').add({
          user_id,
          history,
          favorites: [],
          updated_at: now,
          created_at: now
        });
      }
      
      return this.success({ success: true });
    } catch (error: any) {
      console.error('保存历史记录失败:', error);
      return this.fail('保存历史记录失败');
    }
  }

  async saveFavorites(user_id: string, favorites: FavoriteItem[]): Promise<IApiResult<any>> {
    try {
      const db = uniCloud.database();
      const now = Date.now();
      
      const exists = await db.collection('mbti_user_data')
        .where({ user_id })
        .count();
      
      if (exists.total > 0) {
        await db.collection('mbti_user_data')
          .where({ user_id })
          .update({
            favorites,
            updated_at: now
          });
      } else {
        await db.collection('mbti_user_data').add({
          user_id,
          history: [],
          favorites,
          updated_at: now,
          created_at: now
        });
      }
      
      return this.success({ success: true });
    } catch (error: any) {
      console.error('保存收藏失败:', error);
      return this.fail('保存收藏失败');
    }
  }

  async deleteAllData(user_id: string): Promise<IApiResult<any>> {
    try {
      const db = uniCloud.database();
      await db.collection('mbti_user_data')
        .where({ user_id })
        .remove();
      
      return this.success({ success: true });
    } catch (error: any) {
      console.error('删除所有数据失败:', error);
      return this.fail('删除所有数据失败');
    }
  }
}