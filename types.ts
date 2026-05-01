export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  STORE = 'STORE',
  DRIVER = 'DRIVER',
  ADMIN = 'ADMIN'
}

export enum OrderStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  PICKED_UP = 'PICKED_UP',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED'
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  storeId: string;
  storeName: string;
  driverId?: string;
  items: string;
  totalPrice: number;
  status: OrderStatus;
  createdAt: number;
}
