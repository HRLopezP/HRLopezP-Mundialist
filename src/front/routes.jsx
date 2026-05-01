import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
} from "react-router-dom";
import React, { lazy, Suspense } from "react";
import { Layout } from "./pages/Layout";
import { Home } from "./pages/Home";
const Register = lazy(() => import("./pages/Register"));
const Login = lazy(() => import("./pages/Login"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Profile = lazy(() => import("./pages/Profile"));
const RolesAdmin = lazy(() => import("./pages/RolesAdmin"));
const UsersAdmin = lazy(() => import("./pages/UsersAdmin"));
const Predictions = lazy(() => import("./pages/Predictions"));
const MatchAdmin = lazy(() => import("./pages/MatchAdmin"));
const Ranking = lazy(() => import("./pages/Ranking"));
const TransparencyWall = lazy(() => import("./pages/TransparencyWall"));
const Rules = lazy(() => import("./pages/Rules"));
const AuditPanel = lazy(() => import("./pages/AuditPanel"));
const GroupsAdmin = lazy(() => import("./pages/GroupsAdmin"));
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";


export const router = createBrowserRouter(
  createRoutesFromElements(

    <Route
      path="/"
      element={
        <Suspense fallback={<div className="text-center mt-5">Cargando...</div>}>
          <Layout />
        </Suspense>
      }
      errorElement={<h1>Not found!</h1>}
    >

      <Route path="/" element={<Home />} />
      <Route path="/register" element={< Register />} />
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/predictions" element={<ProtectedRoute><Predictions /></ProtectedRoute>} />
      <Route path="/transparency-wall" element={<ProtectedRoute><TransparencyWall /></ProtectedRoute>} />
      <Route path="/ranking" element={<ProtectedRoute><Ranking /></ProtectedRoute>} />
      <Route path="/admin">
        <Route path="users" element={<AdminRoute><UsersAdmin /></AdminRoute>} />
        <Route path="roles" element={<AdminRoute><RolesAdmin /></AdminRoute>} />
        <Route path="matches" element={<AdminRoute><MatchAdmin /></AdminRoute>} />
        <Route path="audit" element={<AdminRoute><AuditPanel /></AdminRoute>} />
        <Route path="groups" element={<AdminRoute><GroupsAdmin /></AdminRoute>}/>
      </Route>
      <Route path="/rules" element={<Rules />} />

    </Route>
  )
);