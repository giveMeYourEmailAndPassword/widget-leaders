import { clsx, type ClassValue } from 'clsx';
import { Contract, ExchangeRates } from '../types';

// Утилита для объединения классов
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

// Форматирование валюты
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

// Функция для расчета комиссии в разных валютах
export function getCommissionInCurrencies(contract: Contract, rates: ExchangeRates) {
  const { netto_price, currency } = contract;
  const commission = netto_price * 0.05; // 5% комиссия

  if (currency === 'USD') {
    return {
      USD: commission,
      EUR: commission / rates.EUR,
      RUB: commission * rates.RUB,
      KGS: commission * rates.KGS,
      KZT: commission * rates.KZT
    };
  }

  // Конвертация в USD для других валют
  const usdRate = rates[currency as keyof ExchangeRates] || 1;
  const commissionUSD = commission / usdRate;

  return {
    USD: commissionUSD,
    EUR: commissionUSD / rates.EUR,
    RUB: commissionUSD * rates.RUB,
    KGS: commissionUSD * rates.KGS,
    KZT: commissionUSD * rates.KZT
  };
}

// Форматирование даты для PocketBase
export function formatPbDate(date: Date): string {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}