import { useQuery } from '@tanstack/react-query';
import pb from '../pocketbase';
import { Contract, ExchangeRates, LeaderboardOfficeData } from '../types';

// Функция для получения курсов валют
const fetchExchangeRates = async (): Promise<ExchangeRates> => {
  const response = await fetch("https://valuta-production.up.railway.app/rates", {
    headers: { "Authorization": "Bearer ikram228112233" }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch exchange rates');
  }

  return response.json();
};

// Функция для расчета комиссии в разных валютах
const getCommissionInCurrencies = (contract: Contract, rates: ExchangeRates) => {
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
};

// Форматирование даты для PocketBase
const formatPbDate = (date: Date): string => {
  return date.toISOString().slice(0, 19).replace('T', ' ');
};

export const useOfficesLeaderboard = (startDate?: Date, endDate?: Date) => {
  return useQuery({
    queryKey: ['contracts', 'officeLeaderboard', { startDate, endDate }],
    queryFn: async () => {
      const end = endDate || new Date();
      const start = startDate || new Date(end.getFullYear(), 0, 1); // Начало года по умолчанию

      const startPbFormat = formatPbDate(start);
      const endPbFormat = formatPbDate(end);

      // Получаем контракты с фильтрацией по дате и офису
      const contracts = await pb
        .collection('contracts')
        .getFullList<Contract>({
          expand: 'office',
          filter: `created >= "${startPbFormat}" && created <= "${endPbFormat}" && is_deleted = false`,
          sort: '-created',
        });

      // Получаем курсы валют
      const rates = await fetchExchangeRates();

      // Группировка по офисам
      const officeMap = new Map<string, any>();

      contracts.forEach((contract) => {
        // Строгое правило: нет netto = не считается
        if (contract.netto_price == null || contract.netto_price <= 0) {
          return;
        }

        const officeId = contract.office;
        const officeName = contract.expand?.office?.name || `Office ${officeId}`;

        const commissionInCurrencies = getCommissionInCurrencies(contract, rates);
        const commissionUSD = commissionInCurrencies.USD;

        if (!officeMap.has(officeId)) {
          officeMap.set(officeId, {
            officeId,
            officeName,
            totalCommissionUSD: 0,
            contractCount: 0
          });
        }

        const officeData = officeMap.get(officeId);
        officeData.totalCommissionUSD += commissionUSD;
        officeData.contractCount += 1;
      });

      // Сортировка и ранжирование
      const sorted = Array.from(officeMap.values())
        .sort((a, b) => b.totalCommissionUSD - a.totalCommissionUSD)
        .map((office, index) => ({
          ...office,
          rank: index + 1,
          isCurrentOffice: false // Будет обновлено в компоненте
        }));

      return sorted as LeaderboardOfficeData[];
    },
    staleTime: 5 * 60 * 1000, // 5 минут кэширования
    retry: 3,
    retryDelay: 1000,
  });
};

export const useUserOffice = () => {
  return useQuery({
    queryKey: ['currentUser', 'office'],
    queryFn: async () => {
      if (!pb.authStore.isValid) {
        return null;
      }

      const userId = pb.authStore.record?.id;
      if (!userId) {
        return null;
      }

      const user = await pb.collection('users').getOne(userId, {
        expand: 'office',
      });

      return user.expand?.office || null;
    },
    staleTime: 10 * 60 * 1000, // 10 минут кэширования
    enabled: pb.authStore.isValid,
  });
};