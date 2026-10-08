import { createContext, useContext } from "react";

export const AdminSessionContext = createContext({ session: null, permissions: [] });

export function useAdminSession() {
  return useContext(AdminSessionContext);
}
