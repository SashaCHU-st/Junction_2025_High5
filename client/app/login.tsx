
import React from "react";
import { View, Text, TextInput, Button, TouchableWithoutFeedback, Keyboard } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { router } from "expo-router";
import authStyles from "../src/styles/AuthStyles";

type FormData = {
  email: string;
  password: string;
};

export default function LoginScreen() {
  const { control, handleSubmit } = useForm<FormData>();

  const onSubmit = (data: FormData) => {
    console.log("Login data:", data);
    router.push("/home");
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={authStyles.overlay}>
        <View style={authStyles.modal}>
          <Text style={authStyles.title}>Login</Text>

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value } }) => (
              <TextInput
                placeholder="Email"
                value={value}
                onChangeText={onChange}
                style={authStyles.input}
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, value } }) => (
              <TextInput
                placeholder="Password"
                secureTextEntry
                value={value}
                onChangeText={onChange}
                style={authStyles.input}
              />
            )}
          />

          <Button title="Login" onPress={handleSubmit(onSubmit)} />

          <Text
            style={authStyles.link}
            onPress={() => router.push("/register")}
          >
            Don’t have an account? Register
          </Text>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
}
