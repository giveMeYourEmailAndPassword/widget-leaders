import { useQuery } from '@tanstack/react-query';
import pb from '../pocketbase';
import { Contract, ExchangeRates, User } from '../types';
import { formatPbDate } from '../lib/utils';

// Функция для получения курсов валют
export const useExchangeRates = () => {
  return useQuery({
    queryKey: ['exchangeRates'],
    queryFn: async (): Promise<ExchangeRates> => {
      const response = await fetch("https://valuta-production.up.railway.app/rates", {
        headers: { "Authorization": "Bearer ikram228112233" }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch exchange rates');
      }

      return response.json();
    },
    staleTime: 30 * 60 * 1000, // 30 минут кэширования
    retry: 3,
    retryDelay: 1000,
  });
};

// Функция для получения текущего пользователя
export const useUser = () => {
  return useQuery({
    queryKey: ['currentUser'],
    queryFn: async (): Promise<User | null> => {
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

      return user;
    },
    staleTime: 10 * 60 * 1000, // 10 минут кэширования
    enabled: pb.authStore.isValid,
  });
};

// Функция для получения контрактов для лидерборда менеджеров
export const useManagersLeaderboard = (
  startDate: Date,
  endDate: Date,
  officeId?: string
) => {
  return useQuery({
    queryKey: ['contracts', 'managersLeaderboard', { startDate, endDate, officeId }],
    queryFn: async () => {
      const startPbFormat = formatPbDate(startDate);
      const endPbFormat = formatPbDate(endDate);

      let filter = `created >= "${startPbFormat}" && created <= "${endPbFormat}" && is_deleted = false`;

      if (officeId) {
        filter += ` && office = "${officeId}"`;
      }

      // Получаем контракты с расширением данных о создателях
      const contracts = await pb
        .collection('contracts')
        .getFullList<Contract>({
          expand: 'office,created_by,created_by.office',
          filter,
          sort: '-created',
        });

      return contracts;
    },
    staleTime: 5 * 60 * 1000, // 5 минут кэширования
    retry: 3,
    retryDelay: 1000,
  });
};