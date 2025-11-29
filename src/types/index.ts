export interface Office {
  id: string;
  name: string;
  created: string;
  updated: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  office: string;
  created: string;
  updated: string;
  expand?: {
    office?: Office;
  };
}

export interface Contract {
  id: string;
  name: string;
  office: string;
  created_by: string;
  created: string;
  updated: string;
  netto_price: number;
  currency: string;
  is_deleted: boolean;
  printed_at?: string;
  expand?: {
    office?: Office;
    created_by?: User;
  };
}

export interface Payment {
  id: string;
  contract_id: string;
  amount: number;
  currency: string;
  created: string;
  updated: string;
  is_deleted: boolean;
}

export interface ExchangeRates {
  USD: number;
  EUR: number;
  RUB: number;
  KGS: number;
  KZT: number;
}

export interface OfficeData {
  officeId: string;
  officeName: string;
  totalCommissionUSD: number;
  contractCount: number;
}

export interface LeaderboardOfficeData extends OfficeData {
  rank: number;
  isCurrentOffice: boolean;
}