import { Platform, StatusBar, StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 40,
    paddingBottom: 20,
    backgroundColor: "#5E72E4",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFF",
    marginLeft: 15,
  },
  scrollContainer: {
    padding: 20,
  },
    summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 15,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  totalCommissionCard: {
    backgroundColor: '#5E72E4',
  },
  pendingCommissionCard: {
    backgroundColor: '#6B46C1',
  },
  cardIconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 15,
    color: '#FFF',
    opacity: 0.9,
    marginBottom: 5,
  },
  cardAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 15,
  },
  pendingAmount: {
    color: '#FEB2B2', 
  },
  
  summaryTitle: {
    fontSize: 14,
    color: '#FFF',
    marginBottom: 10,
    textAlign: 'center', 
  },
  summaryAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },

  engineerCard: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  engineerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EBF4FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  engineerInfo: {
    marginLeft: 12,
  },
  engineerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2D3748',
  },
  engineerStatus: {
    fontSize: 12,
    marginTop: 4,
  },
  pendingStatus: {
    color: '#E53E3E',
  },
  paidStatus: {
    color: '#38A169',
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  engineerAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2D3748',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    width: '90%',
    maxHeight: '80%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3748',
  },
  modalContent: {
    paddingVertical: 10,
  },
  modalEngineerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 15,
    textAlign: 'center',
  },
  paymentSummary: {
    marginVertical: 20,
    backgroundColor: '#F7FAFC',
    borderRadius: 10,
    padding: 15,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#4A5568',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3748',
  },
  paymentInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    fontSize: 16,
    color: '#2D3748',
  },
  paymentButton: {
    backgroundColor: '#5E72E4',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  paymentButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});