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
  const [startDate, setStartDate] = useState<Date>(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1); // По умолчанию последний месяц
    return date;
  });
  const [endDate, setEndDate] = useState<Date>(() => new Date());
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

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

          <div className="filters">
            <div className="date-filters">
              <div className="date-filter">
                <label htmlFor="start-date">Начальная дата:</label>
                <input
                  id="start-date"
                  type="date"
                  value={startDate.toISOString().split("T")[0]}
                  onChange={(e) =>
                    setStartDate(
                      e.target.value ? new Date(e.target.value) : new Date()
                    )
                  }
                />
              </div>
              <div className="date-filter">
                <label htmlFor="end-date">Конечная дата:</label>
                <input
                  id="end-date"
                  type="date"
                  value={endDate.toISOString().split("T")[0]}
                  onChange={(e) =>
                    setEndDate(
                      e.target.value ? new Date(e.target.value) : new Date()
                    )
                  }
                />
              </div>
            </div>
          </div>

          <div className="widget-container">
            <LeaderboardWidget startDate={startDate} endDate={endDate} />
          </div>
        </div>
      </div>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;
