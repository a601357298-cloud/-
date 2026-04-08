export interface User {
  id: string;
  username: string;
  displayName: string;
  role: "admin" | "user";
  createdAt: string;
}

export interface Category {
  slug: string;
  name: string;
  order: number;
  isDefault: boolean;
  count: number;
}

export interface Question {
  id: string;
  category: string;
  question: string;
  answer: string;
  authorName: string;
  createdAt: string;
  createdByUserId: string;
}

