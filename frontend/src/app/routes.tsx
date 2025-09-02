import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "./layout/AppLayout";
import LeaderboardPage from "../pages/Leaderboard/LeaderboardPage";
import SkinsPage from "../pages/Skins/SkinsPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <LeaderboardPage /> },
      { path: "leaderboard", element: <LeaderboardPage /> },
      { path: "skins", element: <SkinsPage /> }
    ],
  },
]);
