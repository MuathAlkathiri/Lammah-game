"use client";

import axios, { type AxiosError } from "axios";
import { useQuery } from "@tanstack/react-query";
import {
  authGetCurrentUser,
  useAuthLogin,
  useAuthRegister,
} from "@/api/generated/auth/auth";
import type {
  ErrorResponseDto,
  LoginDto,
  RegisterDto,
} from "@/api/generated/models";
import { toUser } from "@/features/users/mappers/user-response.mapper";
import { toAuthResponse } from "../mappers/auth-response.mapper";
import { authStorage } from "../storage/auth-storage";

type AuthApiError = AxiosError<ErrorResponseDto>;

export const authKeys = { currentUser: ["auth", "current-user"] as const };

export function useCurrentUser(enabled: boolean) {
  return useQuery({
    queryKey: authKeys.currentUser,
    queryFn: fetchCurrentUser,
    enabled: enabled && Boolean(authStorage.getToken()),
    initialData: () =>
      authStorage.getToken() ? (authStorage.getUser() ?? undefined) : undefined,
    retry: false,
  });
}

export const fetchCurrentUser = async () => toUser(await authGetCurrentUser());

export function useLoginMutation() {
  const mutation = useAuthLogin<AuthApiError>();
  return {
    ...mutation,
    mutateAsync: (data: LoginDto) =>
      mutation.mutateAsync({ data }).then(toAuthResponse),
  };
}

export function useRegisterMutation() {
  const mutation = useAuthRegister<AuthApiError>();
  return {
    ...mutation,
    mutateAsync: async (data: RegisterDto) => {
      try {
        return toAuthResponse(await mutation.mutateAsync({ data }));
      } catch (error) {
        if (!axios.isAxiosError(error) || error.response?.status !== 400)
          throw error;
        const legacyCompatibleData = { ...data, name: data.fullName };
        return toAuthResponse(
          await mutation.mutateAsync({ data: legacyCompatibleData }),
        );
      }
    },
  };
}
