import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
} from "react-router-dom";
import { Layout } from "./pages/Layout";
import { Home } from "./pages/Home";
import { Single } from "./pages/Single";
import { Demo } from "./pages/Demo";
import Register from "./pages/Register";
import { Login } from "./pages/Login"
import ForgotPassword from "./pages/ForgotPassword"
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profile";
import ProtectedRoute from "./components/ProtectedRoute";
import RolesAdmin from "./pages/RolesAdmin";
import AdminRoute from "./components/AdminRoute";
import UsersAdmin from "./pages/UsersAdmin";
import { Predictions } from "./pages/Predictions";
import { MatchAdmin } from "./pages/MatchAdmin";
import Ranking from "./pages/Ranking";

export const router = createBrowserRouter(
  createRoutesFromElements(

    <Route path="/" element={<Layout />} errorElement={<h1>Not found!</h1>} >

      {/* Nested Routes: Defines sub-routes within the BaseHome component. */}
      <Route path="/" element={<Home />} />
      <Route path="/single/:theId" element={<Single />} />  {/* Dynamic route for single items */}
      <Route path="/demo" element={<Demo />} />
      <Route path="/register" element={< Register />} />
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />

      <Route
        path="/predictions"
        element={
          <ProtectedRoute>
            <Predictions />
          </ProtectedRoute>
        }
      />

      <Route
        path="/ranking"
        element={
          <ProtectedRoute>
            <Ranking />
          </ProtectedRoute>
        }
      />

      <Route path="/admin">
        <Route
          path="users"
          element={
            <AdminRoute>
              <UsersAdmin />
            </AdminRoute>
          }
        />
        <Route
          path="roles"
          element={
            <AdminRoute>
              <RolesAdmin />
            </AdminRoute>
          }
        />

        <Route
          path="matches"
          element={
            <AdminRoute>
              <MatchAdmin />
            </AdminRoute>
          }
        />
      </Route>

    </Route>
  )
);