import { inject, Injectable } from '@angular/core';
import { Firestore, collection, doc, addDoc, getDoc, getDocs, updateDoc, deleteDoc, CollectionReference, DocumentData } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class FireStoreService {
  private firestore: Firestore = inject(Firestore);

  /**
   * Получить ссылку на коллекцию
   */
  private getCollectionRef(path: string): CollectionReference<DocumentData> {
    return collection(this.firestore, path);
  }

  /**
   * CREATE: добавить документ в коллекцию
   */
  async addItem<T>(collectionPath: string, data: T) {
    console.log('data :>> ', data);
    console.log('collectionPath :>> ', collectionPath);
    const colRef = this.getCollectionRef(collectionPath);
    return await addDoc(colRef, data as any);
  }

  /**
   * READ: получить все документы из коллекции
   */
  async getAll<T>(collectionPath: string): Promise<T[]> {
    const colRef = this.getCollectionRef(collectionPath);
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as T[];
  }

  /**
   * READ: получить один документ по ID
   */
  async getById<T>(collectionPath: string, id: string): Promise<T | null> {
    const docRef = doc(this.firestore, `${collectionPath}/${id}`);
    const snapshot = await getDoc(docRef);
    return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as T) : null;
  }

  /**
   * UPDATE: обновить документ по ID
   */
  async updateItem<T>(collectionPath: string, id: string, data: Partial<T>) {
    const docRef = doc(this.firestore, `${collectionPath}/${id}`);
    return await updateDoc(docRef, data as any);
  }

  /**
   * DELETE: удалить документ по ID
   */
  async deleteItem(collectionPath: string, id: string) {
    const docRef = doc(this.firestore, `${collectionPath}/${id}`);
    return await deleteDoc(docRef);
  }
}
