export type AuthUser = {
  id?: number | string;
  name?: string;
  username?: string;
  email?: string;
  role?: string;
  organizationId?: number | string;
  organizationName?: string;
};

export type LoginResponse = {
  user: AuthUser;
  token?: string;
  message?: string;
};

/** Local demo session — CattleFeed has no backend yet. Any login succeeds. */
export async function loginRequest(email: string, password: string): Promise<LoginResponse> {
  const id = email.trim() || "demo";
  const name = id.includes("@") ? id.split("@")[0] : id;
  void password;
  return {
    message: "Demo login",
    token: "demo",
    user: {
      id: "demo",
      name: name || "Demo",
      username: name || "demo",
      email: id.includes("@") ? id : `${id}@catelfeed.local`,
      role: "operator",
      organizationName: "CattleFeed",
    },
  };
}
