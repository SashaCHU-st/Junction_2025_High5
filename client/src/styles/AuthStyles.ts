import { StyleSheet } from "react-native";
import { COLORS, SPACING, TYPOGRAPHY, METRICS } from "../theme";

const authStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: SPACING.lg,
    backgroundColor: COLORS.background,
  },
  title: {
    fontSize: TYPOGRAPHY.size.xlarge,
    fontWeight: TYPOGRAPHY.weight.bold as "700",
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    borderRadius: METRICS.borderRadius,
    marginBottom: SPACING.md,
  },
  link: {
    color: COLORS.primary,
    textAlign: "center",
    marginTop: SPACING.sm,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    width: "50%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});

export default authStyles;
