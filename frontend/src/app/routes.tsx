import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "./layout/AppLayout";
import LeaderboardPage from "../pages/Leaderboard/LeaderboardPage";

// Skins
import SkinsIndex from "../pages/Skins/SkinsIndex";
import SkinsByWeapon from "../pages/Skins/SkinsByWeaponPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <LeaderboardPage /> },
      { path: "leaderboard", element: <LeaderboardPage /> },

      // Skins
      { path: "skins", element: <SkinsIndex /> },
      { path: "skins/weapon/:uuid", element: <SkinsByWeapon /> },
    ],
  },
]);
