import React from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { useForm, Controller } from "react-hook-form";
import { router } from "expo-router";
import authStyles from "./src/styles/AuthStyles";

type FormData = {
  name: string;
  email: string;
  password: string;
  age: string;
  gender: string;
  location: string;
};

export default function RegisterScreen() {
  const { control, handleSubmit } = useForm<FormData>({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      age: "",
      gender: "",
      location: "",
    },
  });

  const onSubmit = (data: FormData) => {
    console.log("Registration data:", data);
    router.push("/home");
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={authStyles.overlay}>
        <View style={authStyles.modal}>
          <Text style={authStyles.title}>Register</Text>

          {/* Name */}
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, value } }) => (
              <TextInput
                placeholder="Full Name"
                value={value}
                onChangeText={onChange}
                style={authStyles.input}
              />
            )}
          />

          {/* Email */}
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

          {/* Password */}
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

          {/* Age */}
          <Controller
            control={control}
            name="age"
            render={({ field: { onChange, value } }) => (
              <TextInput
                placeholder="Age"
                keyboardType="numeric"
                value={value}
                onChangeText={onChange}
                style={authStyles.input}
              />
            )}
          />

          {/* Gender */}
          <Controller
            control={control}
            name="gender"
            render={({ field: { onChange, value } }) => (
              <TextInput
                placeholder="Gender (Male/Female/Other)"
                value={value}
                onChangeText={onChange}
                style={authStyles.input}
              />
            )}
          />

          {/* Location */}
          <Controller
            control={control}
            name="location"
            render={({ field: { onChange, value } }) => (
              <TextInput
                placeholder="Location"
                value={value}
                onChangeText={onChange}
                style={authStyles.input}
              />
            )}
          />

          {/* Register button */}
          <Button title="Register" onPress={handleSubmit(onSubmit)} />

          {/* Link to login */}
          <Text
            style={authStyles.link}
            onPress={() => router.push("/login")}
          >
            Already have an account? Login
          </Text>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
}
