import { IExpense } from "../models/expense.interface";

export const expenses: IExpense[] = [
  {
    id: "1",
    amount: 250,
    category: "Еда",
    date: "2025-04-27T18:45:00.000Z",
    description: "Ужин в ресторане",
    paymentMethod: "card",
    createdAt: "2025-04-27T18:46:00.000Z"
  },
  {
    id: "2",
    amount: 50,
    category: "Транспорт",
    date: "2025-04-27T08:30:00.000Z",
    description: "Проезд на автобусе",
    paymentMethod: "cash",
    createdAt: "2025-04-27T08:31:00.000Z"
  },
  {
    id: "3",
    amount: 1200,
    category: "Развлечения",
    date: "2025-04-26T21:00:00.000Z",
    description: "Билеты в кино для двоих",
    paymentMethod: "card",
    createdAt: "2025-04-26T21:01:00.000Z"
  },
  {
    id: "4",
    amount: 3200,
    category: "Покупки",
    date: "2025-04-25T14:00:00.000Z",
    description: "Новая обувь",
    paymentMethod: "card",
    createdAt: "2025-04-25T14:01:00.000Z"
  },
  {
    id: "5",
    amount: 500,
    category: "Здоровье",
    date: "2025-04-24T10:15:00.000Z",
    description: "Лекарства в аптеке",
    paymentMethod: "cash",
    createdAt: "2025-04-24T10:16:00.000Z"
  },
  {
    id: "6",
    amount: 999,
    category: "Подписки",
    date: "2025-04-23T12:00:00.000Z",
    description: "Ежемесячная подписка на Spotify",
    paymentMethod: "card",
    createdAt: "2025-04-23T12:01:00.000Z"
  },
  {
    id: "7",
    amount: 275,
    category: "Дом",
    date: "2025-04-22T16:45:00.000Z",
    description: "Покупка бытовой химии",
    paymentMethod: "cash",
    createdAt: "2025-04-22T16:46:00.000Z"
  },
  {
    id: "8",
    amount: 150,
    category: "Подарки",
    date: "2025-04-21T19:00:00.000Z",
    description: "Цветы на день рождения",
    paymentMethod: "cash",
    createdAt: "2025-04-21T19:01:00.000Z"
  },
  {
    id: "9",
    amount: 4000,
    category: "Образование",
    date: "2025-04-20T11:30:00.000Z",
    description: "Курс по веб-разработке",
    paymentMethod: "card",
    createdAt: "2025-04-20T11:31:00.000Z"
  },
  {
    id: "10",
    amount: 320,
    category: "Животные",
    date: "2025-04-19T17:15:00.000Z",
    description: "Корм для кошки",
    paymentMethod: "card",
    createdAt: "2025-04-19T17:16:00.000Z"
  }
];

