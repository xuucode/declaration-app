import { Request, Response } from 'express';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLES } from '../config/dynamodb.js';
import { v4 as uuidv4 } from 'uuid';

const MAX_NAME_LENGTH = 80;
const MAX_EMAIL_LENGTH = 200;
const MAX_SUBJECT_LENGTH = 120;
const MAX_MESSAGE_LENGTH = 3000;

export const createContact = async (req: Request, res: Response): Promise<void> => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
    res.status(400).json({ message: '必須項目が不足しています' });
    return;
  }

  const normalizedName = String(name).trim();
  const normalizedEmail = String(email).trim().toLowerCase();
  const normalizedSubject = String(subject).trim();
  const normalizedMessage = String(message).trim();

  if (
    normalizedName.length > MAX_NAME_LENGTH ||
    normalizedEmail.length > MAX_EMAIL_LENGTH ||
    normalizedSubject.length > MAX_SUBJECT_LENGTH ||
    normalizedMessage.length > MAX_MESSAGE_LENGTH
  ) {
    res.status(400).json({ message: '入力内容が長すぎます' });
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    res.status(400).json({ message: 'メールアドレスの形式が正しくありません' });
    return;
  }

  try {
    const createdAt = new Date().toISOString();
    const item = {
      contactId: uuidv4(),
      name: normalizedName,
      email: normalizedEmail,
      subject: normalizedSubject,
      message: normalizedMessage,
      status: 'new',
      createdAt,
    };

    await docClient.send(
      new PutCommand({
        TableName: TABLES.CONTACTS,
        Item: item,
      })
    );

    res.status(201).json({ message: 'お問い合わせを受け付けました' });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
};
