export interface AuthResponseUser {
    id: string;
    name: string;
    email: string;
    role: string;
}

export interface AuthResponse {
    user: AuthResponseUser;
    accessToken?: string;
}
