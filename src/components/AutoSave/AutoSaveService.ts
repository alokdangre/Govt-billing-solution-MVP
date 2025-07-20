import { Local, File } from '../Storage/LocalStorage';
import * as AppGeneral from '../socialcalc/index.js';

export interface AutoSaveConfig {
  enabled: boolean;
  intervalSeconds: number;
  showNotifications: boolean;
}

export class AutoSaveService {
  private static instance: AutoSaveService;
  private intervalId: NodeJS.Timeout | null = null;
  private config: AutoSaveConfig;
  private store: Local;
  private currentFile: string = '';
  private currentBillType: number = 1;
  private lastSavedContent: string = '';
  private onStatusChange?: (status: AutoSaveStatus) => void;

  private constructor() {
    this.store = new Local();
    this.config = this.loadConfig();
  }

  public static getInstance(): AutoSaveService {
    if (!AutoSaveService.instance) {
      AutoSaveService.instance = new AutoSaveService();
    }
    return AutoSaveService.instance;
  }

  private loadConfig(): AutoSaveConfig {
    try {
      const savedConfig = localStorage.getItem('autoSaveConfig');
      if (savedConfig) {
        return JSON.parse(savedConfig);
      }
    } catch (error) {
      console.error('Failed to load auto-save config:', error);
    }
    
    // Default configuration
    return {
      enabled: true,
      intervalSeconds: 1, // Auto-save every 1 second by default
      showNotifications: false // Silent auto-save without notifications
    };
  }

  private saveConfig(): void {
    try {
      localStorage.setItem('autoSaveConfig', JSON.stringify(this.config));
    } catch (error) {
      console.error('Failed to save auto-save config:', error);
    }
  }

  public getConfig(): AutoSaveConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<AutoSaveConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.saveConfig();
    
    // Restart auto-save with new settings
    if (this.config.enabled && this.currentFile) {
      this.start(this.currentFile, this.currentBillType);
    } else {
      this.stop();
    }
  }

  public setStatusChangeCallback(callback: (status: AutoSaveStatus) => void): void {
    this.onStatusChange = callback;
  }

  private notifyStatusChange(status: AutoSaveStatus): void {
    if (this.onStatusChange) {
      this.onStatusChange(status);
    }
  }

  public start(fileName: string, billType: number = 1): void {
    this.currentFile = fileName;
    this.currentBillType = billType;

    // Don't auto-save the default file
    if (fileName === 'default' || fileName === 'Untitled') {
      this.stop();
      return;
    }

    if (!this.config.enabled) {
      return;
    }

    // Clear existing interval
    this.stop();

    // Get initial content
    try {
      this.lastSavedContent = AppGeneral.getSpreadsheetContent();
    } catch (error) {
      console.error('Failed to get initial content:', error);
      return;
    }

    // Start auto-save interval
    this.intervalId = setInterval(() => {
      this.performAutoSave();
    }, this.config.intervalSeconds * 1000);

    this.notifyStatusChange({
      isActive: true,
      lastSaved: null,
      nextSave: new Date(Date.now() + this.config.intervalSeconds * 1000),
      hasUnsavedChanges: false
    });
  }

  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.notifyStatusChange({
      isActive: false,
      lastSaved: null,
      nextSave: null,
      hasUnsavedChanges: false
    });
  }

  private async performAutoSave(): Promise<void> {
    if (!this.currentFile || this.currentFile === 'default' || this.currentFile === 'Untitled') {
      return;
    }

    try {
      // Get current content
      const currentContent = AppGeneral.getSpreadsheetContent();
      
      // Check if content has changed
      if (currentContent === this.lastSavedContent) {
        // No changes, update next save time
        this.notifyStatusChange({
          isActive: true,
          lastSaved: null,
          nextSave: new Date(Date.now() + this.config.intervalSeconds * 1000),
          hasUnsavedChanges: false
        });
        return;
      }

      // Check if file exists
      const fileExists = await this.store._checkKey(this.currentFile);
      if (!fileExists) {
        console.warn('Auto-save: File does not exist, skipping auto-save');
        return;
      }

      // Get existing file data
      const existingData = await this.store._getFile(this.currentFile);
      
      // Create updated file
      const updatedFile = new File(
        existingData.created,
        new Date().toISOString(),
        encodeURIComponent(currentContent),
        this.currentFile,
        this.currentBillType,
        existingData.passwordProtected
      );

      // Save the file
      await this.store._saveFile(updatedFile);
      
      // Update last saved content
      this.lastSavedContent = currentContent;

      // Notify status change
      this.notifyStatusChange({
        isActive: true,
        lastSaved: new Date(),
        nextSave: new Date(Date.now() + this.config.intervalSeconds * 1000),
        hasUnsavedChanges: false
      });

      // Show notification if enabled
      if (this.config.showNotifications) {
        this.showAutoSaveNotification();
      }

    } catch (error) {
      console.error('Auto-save failed:', error);
      
      this.notifyStatusChange({
        isActive: true,
        lastSaved: null,
        nextSave: new Date(Date.now() + this.config.intervalSeconds * 1000),
        hasUnsavedChanges: true,
        error: error.message
      });
    }
  }

  private showAutoSaveNotification(): void {
    // Create a subtle notification
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #4CAF50;
      color: white;
      padding: 8px 16px;
      border-radius: 4px;
      font-size: 14px;
      z-index: 10000;
      opacity: 0;
      transition: opacity 0.3s ease;
      pointer-events: none;
    `;
    notification.textContent = `Auto-saved: ${this.currentFile}`;
    
    document.body.appendChild(notification);
    
    // Fade in
    setTimeout(() => {
      notification.style.opacity = '1';
    }, 10);
    
    // Fade out and remove
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 2000);
  }

  public async manualSave(): Promise<boolean> {
    if (!this.currentFile || this.currentFile === 'default' || this.currentFile === 'Untitled') {
      return false;
    }

    try {
      await this.performAutoSave();
      return true;
    } catch (error) {
      console.error('Manual save failed:', error);
      return false;
    }
  }

  public hasUnsavedChanges(): boolean {
    if (!this.currentFile || this.currentFile === 'default' || this.currentFile === 'Untitled') {
      return false;
    }

    try {
      const currentContent = AppGeneral.getSpreadsheetContent();
      return currentContent !== this.lastSavedContent;
    } catch (error) {
      console.error('Failed to check for unsaved changes:', error);
      return false;
    }
  }

  public updateCurrentFile(fileName: string, billType: number = 1): void {
    if (fileName !== this.currentFile) {
      this.start(fileName, billType);
    } else {
      this.currentBillType = billType;
    }
  }
}

export interface AutoSaveStatus {
  isActive: boolean;
  lastSaved: Date | null;
  nextSave: Date | null;
  hasUnsavedChanges: boolean;
  error?: string;
}
