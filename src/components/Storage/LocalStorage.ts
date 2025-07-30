import { Preferences } from "@capacitor/preferences";
import CryptoJS from "crypto-js";

export class File {
  created: string;
  modified: string;
  name: string;
  content: string;
  billType: number;
  passwordProtected?: boolean;
  password?: string;

  constructor(
    created: string,
    modified: string,
    content: string,
    name: string,
    billType: number,
    passwordProtected?: boolean,
    password?: string
  ) {
    this.created = created;
    this.modified = modified;
    this.content = content;
    this.name = name;
    this.billType = billType;
    this.passwordProtected = passwordProtected;
    this.password = password;
  }
}

export class Local {
  // Save file with optional password protection
  _saveFile = async (file: File) => {
    let content = file.content;
    
    // Encrypt content if password is provided
    if (file.password && file.passwordProtected) {
      content = this._encryptContent(file.content, file.password);
    }
    
    let data = {
      created: file.created,
      modified: file.modified,
      content: content,
      name: file.name,
      billType: file.billType,
      passwordProtected: file.passwordProtected || false,
    };
    await Preferences.set({
      key: file.name,
      value: JSON.stringify(data),
    });
  };

  // Save file with password protection
  _savePasswordProtectedFile = async (file: File, password: string) => {
    const encryptedContent = this._encryptContent(file.content, password);
    
    let data = {
      created: file.created,
      modified: file.modified,
      content: encryptedContent,
      name: file.name,
      billType: file.billType,
      passwordProtected: true,
    };
    
    await Preferences.set({
      key: file.name,
      value: JSON.stringify(data),
    });
  };

  // Get file (basic method - doesn't decrypt)
  _getFile = async (name: string) => {
    const rawData = await Preferences.get({ key: name });
    return JSON.parse(rawData.value);
  };

  // Get file with password (decrypts if password protected)
  _getFileWithPassword = async (name: string, password?: string) => {
    const rawData = await Preferences.get({ key: name });
    const fileData = JSON.parse(rawData.value);
    
    if (fileData.passwordProtected) {
      if (!password) {
        throw new Error('Password required for this file');
      }
      
      try {
        fileData.content = this._decryptContent(fileData.content, password);
      } catch (error) {
        throw new Error('Invalid password');
      }
    }
    
    return fileData;
  };

  // Verify if password is correct for a file
  _verifyPassword = async (name: string, password: string): Promise<boolean> => {
    try {
      await this._getFileWithPassword(name, password);
      return true;
    } catch (error) {
      return false;
    }
  };

  _getAllFiles = async () => {
    let arr = {};
    const { keys } = await Preferences.keys();
    for (let i = 0; i < keys.length; i++) {
      let fname = keys[i];
      const data = await this._getFile(fname);
      arr[fname] = (data as any).modified;
    }
    return arr;
  };

  _deleteFile = async (name: string) => {
    await Preferences.remove({ key: name });
  };

  _checkKey = async (key: string) => {
    const { keys } = await Preferences.keys();
    if (keys.includes(key, 0)) {
      return true;
    } else {
      return false;
    }
  };

  // Private encryption method
  private _encryptContent = (content: string, password: string): string => {
    try {
      return CryptoJS.AES.encrypt(content, password).toString();
    } catch (error) {
      throw new Error('Failed to encrypt content');
    }
  };

  // Private decryption method
  private _decryptContent = (encryptedContent: string, password: string): string => {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedContent, password);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      if (!decrypted) {
        throw new Error('Invalid password or corrupted data');
      }
      return decrypted;
    } catch (error) {
      throw new Error('Failed to decrypt content - invalid password');
    }
  };

  // Check if file is password protected
  _isPasswordProtected = async (name: string): Promise<boolean> => {
    try {
      const fileData = await this._getFile(name);
      return fileData.passwordProtected || false;
    } catch (error) {
      return false;
    }
  };

  // Remove password protection from file
  _removePasswordProtection = async (name: string, password: string) => {
    const fileData = await this._getFileWithPassword(name, password);
    fileData.passwordProtected = false;
    
    const file = new File(
      fileData.created,
      fileData.modified,
      fileData.content,
      fileData.name,
      fileData.billType,
      false
    );
    
    await this._saveFile(file);
  };
}
