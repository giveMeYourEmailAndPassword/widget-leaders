import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { LeaderboardWidget } from "./components/LeaderboardWidget";
import { loginToPocketBase } from "./pocketbase";
import "./App.css";

// Создаем клиент для React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 3,
      staleTime: 5 * 60 * 1000, // 5 минут по умолчанию
    },
  },
});

function App() {
  // Устанавливаем даты для текущего месяца
  const getCurrentMonthDates = () => {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1); // Первое число месяца
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Последнее число месяца
    return { startDate, endDate };
  };

  const { startDate, endDate } = getCurrentMonthDates();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Применяем тему к body при изменении
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Авторизация при загрузке приложения
  useEffect(() => {
    const authenticate = async () => {
      try {
        setLoginError(null);
        await loginToPocketBase();
        setIsLoggedIn(true);
        console.log("Login successful");
      } catch (error) {
        console.error("Authentication error:", error);
        setLoginError("Ошибка авторизации. Проверьте учетные данные.");
        setIsLoggedIn(false);
      }
    };

    authenticate();
  }, []);

  if (!isLoggedIn) {
    return (
      <div className="app">
        <div className="leaderboard-container">
          <div className="auth-container">
            <h1>Авторизация</h1>
            {loginError ? (
              <div className="error-message">{loginError}</div>
            ) : (
              <div className="loading">
                <div className="spinner"></div>
                <p>Авторизация в системе...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="app">
        <div className="leaderboard-container">
          <h1>Лидерборд менеджеров</h1>

          <div className="widget-container">
            <LeaderboardWidget
              startDate={startDate}
              endDate={endDate}
              isDarkMode={isDarkMode}
              onThemeToggle={() => setIsDarkMode(!isDarkMode)}
            />
          </div>
        </div>
      </div>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;
