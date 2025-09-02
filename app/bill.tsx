import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, Alert, Modal, SafeAreaView, ActivityIndicator, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons, Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import SignatureScreen from 'react-native-signature-canvas';
import { styles } from '../constants/BillPage.styles';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, isSameDay } from 'date-fns';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { footerStyles } from '../constants/footer';
import CommissionService from './services/commissionService';
import { Checkbox } from 'react-native-paper';
import Constants from 'expo-constants';

const TURSO_BASE_URL = `${Constants.expoConfig?.extra?.apiUrl}/bill`;
const ENGINEER_URL = `${Constants.expoConfig?.extra?.apiUrl}/engineer`;

type Bill = {
  id: string;
  notes: string;
  billNumber: string;
  serviceType: string;
  serviceboyName: string;
  customerName: string;
  contactNumber: string;
  address: string;
  serviceCharge: string;
  gstPercentage: string;
  paymentMethod: string;
  cashGiven: string;
  change: string;
  createdAt: string;
  signature?: string;
  status: string;
  total: string;
  date: string;
  engineerCommission: string;
  selected?: boolean;
};

type User = {
  id: string;
  name: string;
};

type ServiceKey = 'AC' | 'Washing Machine' | 'Fridge' | 'Microwave' | 'RO Filter' | 'Electrician';
const SERVICE_TYPES: ServiceKey[] = ['AC', 'Washing Machine', 'Fridge', 'Microwave', 'RO Filter', 'Electrician'];

const fieldLabels = {
  serviceType: 'Service Type',
  serviceboyName: 'Engineer Name',
  customerName: 'Customer Name',
  address: 'Address',
  contactNumber: 'Contact Number',
  serviceCharge: 'Service Charge (₹)'
};

const BillPage = () => {
  const params = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState({
    serviceType: '',
    serviceboyName: '',
    customerName: '',
    address: '',
    contactNumber: '',
    serviceCharge: '',
  });
  const [gstPercentage, setGstPercentage] = useState('0');
  const [bills, setBills] = useState<Bill[]>([]);
  const [allBills, setAllBills] = useState<Bill[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [cashGiven, setCashGiven] = useState('');
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [notes, setNotes] = useState('');
  const [isBillDetailVisible, setIsBillDetailVisible] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [isSignatureVisible, setIsSignatureVisible] = useState(false);
  const [serviceBoys, setServiceBoys] = useState<User[]>([]);
  const [selectedServiceBoy, setSelectedServiceBoy] = useState<string | null>(null);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [dateFilter, setDateFilter] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [filterType, setFilterType] = useState<'serviceBoy' | 'date'>('serviceBoy');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const itemsPerPage = 10;
  const [totalBillCount, setTotalBillCount] = useState(0);
  const [engineerCounts, setEngineerCounts] = useState<Record<string, number>>({});
  const [selectedBills, setSelectedBills] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
   const [formData, setFormData] = useState({
        serviceboyName: '',
        serviceType: '',
        customerName: '',
        contactNumber: '',
        address: '',
        serviceCharge: 0,
        notes: '',
        paymentMethod: 'Cash',
        total: '',
        cashGiven: '',
        change: '',
        billNumber: '',
        signature: '',
        gstPercentage: 0,
    });
  useEffect(() => {
    const loadData = async () => {
      await fetchServiceBoys();
      const counts = await fetchEngineerBillCounts();
      setEngineerCounts(counts);
      await fetchBills();
      await fetchTotalBillCount();
    };
    loadData();

    if (params.serviceData) {
      try {
        const serviceData = JSON.parse(params.serviceData as string);
        console.log('Received service data:', serviceData);
        console.log('Service charge:', serviceData.serviceCharge);

        setForm({
          serviceType: String(serviceData.serviceType || ''),
          serviceboyName: String(serviceData.serviceBoy || ''),
          customerName: String(serviceData.clientName || ''),
          address: String(serviceData.address || ''),
          contactNumber: String(serviceData.phone || ''),
          serviceCharge: String(serviceData.serviceCharge || ''),
        });
        setIsFormVisible(true);
      } catch (error) {
        console.error('Error parsing service data:', error);
      }
    }
  }, [params.serviceData]);

  useEffect(() => {
    applyFilters(selectedServiceBoy, dateFilter);
  }, [selectedServiceBoy, dateFilter, searchQuery, allBills]);

  const formatToAmPm = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
    return `${day}/${month}/${year} • ${hours}:${minutesStr} ${ampm}`;
  };

  const fetchServiceBoys = async () => {
    try {
      const response = await fetch(ENGINEER_URL);
      const data = await response.json();

      let engineers = [];
      if (data.result && Array.isArray(data.result)) {
        engineers = data.result;
      } else if (Array.isArray(data)) {
        engineers = data;
      }

      const boys = engineers.map((engineer: any) => ({
        id: engineer.id || engineer.$id,
        name: engineer.engineerName || engineer.name
      }));
      setServiceBoys(boys);
    } catch (error) {
      console.error('Error fetching engineers:', error);
    }
  };

  const filterBillsBySearch = (query: string, billsToFilter: Bill[]) => {
    if (!query.trim()) return billsToFilter;
    const lowerCaseQuery = query.toLowerCase();
    return billsToFilter.filter(bill => {
      return (
        bill.customerName?.toLowerCase().includes(lowerCaseQuery) ||
        bill.serviceType?.toLowerCase().includes(lowerCaseQuery) ||
        bill.serviceboyName?.toLowerCase().includes(lowerCaseQuery) ||
        bill.contactNumber?.toLowerCase().includes(lowerCaseQuery) ||
        bill.address?.toLowerCase().includes(lowerCaseQuery) ||
        bill.billNumber?.toLowerCase().includes(lowerCaseQuery) ||
        bill.total?.toLowerCase().includes(lowerCaseQuery) ||
        bill.paymentMethod?.toLowerCase().includes(lowerCaseQuery) ||
        (bill.notes && bill.notes.toLowerCase().includes(lowerCaseQuery))
      );
    });
  };

  const fetchBills = async (page = 1, isLoadMore = false) => {
    if (page === 1) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }
    try {
      const response = await fetch(TURSO_BASE_URL);
      const data = await response.json();

      const newBills = data.map((bill: any) => ({
        ...bill,
        $id: bill.id,
        $createdAt: bill.createdAt,
        serviceCharge: bill.serviceCharge.toString(),
        gstPercentage: bill.gstPercentage.toString(),
        total: bill.total.toString(),
        cashGiven: bill.cashGiven.toString(),
        change: bill.change.toString(),
        engineerCommission: bill.engineerCommission.toString()
      }));

      if (isLoadMore) {
        const uniqueBills = newBills.filter((newBill: { id: string; }) =>
          !allBills.some(existingBill => existingBill.id === newBill.id)
        );
        setAllBills(prev => [...prev, ...uniqueBills]);
        setBills(prev => [...prev, ...uniqueBills]);
      } else {
        setAllBills(newBills);
        setBills(newBills);
      }

      setTotalPages(Math.ceil(data.length / itemsPerPage));
      setCurrentPage(page);
      setTotalBillCount(data.length);
    } catch (error) {
      console.error('Error fetching bills:', error);
      Alert.alert('Error', 'Failed to fetch bills');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const fetchEngineerBillCounts = async () => {
    try {
      const counts: Record<string, number> = {
        'All Service Engineers': 0
      };

      const response = await fetch(TURSO_BASE_URL);
      const billsData = await response.json();
      counts['All Service Engineers'] = billsData.length;

      const engineersResponse = await fetch(ENGINEER_URL);
      const engineersData = await engineersResponse.json();

      let engineers = [];
      if (engineersData.result && Array.isArray(engineersData.result)) {
        engineers = engineersData.result;
      } else if (Array.isArray(engineersData)) {
        engineers = engineersData;
      }

      engineers.forEach((engineer: any) => {
        const engineerName = engineer.engineerName || engineer.name;
        const engineerBillCount = billsData.filter(
          (bill: any) => bill.serviceboyName === engineerName
        ).length;
        counts[engineerName] = engineerBillCount;
      });

      return counts;
    } catch (error) {
      console.error('Error fetching engineer bill counts:', error);
      return {};
    }
  };

  const fetchTotalBillCount = async () => {
    try {
      const response = await fetch(TURSO_BASE_URL);
      const data = await response.json();
      setTotalBillCount(data.length);
    } catch (error) {
      console.error('Error fetching total bill count:', error);
    }
  };

  const countBillsByServiceBoy = () => {
    return engineerCounts;
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (event.type === 'dismissed') {
      return;
    }
    if (selectedDate) {
      setDateFilter(selectedDate);
      applyFilters(selectedServiceBoy, selectedDate);
    }
  };

  const applyFilters = (serviceBoy: string | null, date: Date | null) => {
    let filtered = allBills;
    if (serviceBoy) {
      filtered = filtered.filter(bill => bill.serviceboyName === serviceBoy);
    }
    if (date) {
      filtered = filtered.filter(bill => {
        const billDate = new Date(bill.createdAt);
        return isSameDay(billDate, date);
      });
    }
    if (searchQuery.trim()) {
      filtered = filterBillsBySearch(searchQuery, filtered);
    }
    setBills(filtered);
  };

  const filterServices = (serviceboyName: string | null) => {
    setSelectedServiceBoy(serviceboyName);
    applyFilters(serviceboyName, dateFilter);
    setFilterModalVisible(false);
  };

  const clearDateFilter = () => {
    setDateFilter(null);
    applyFilters(selectedServiceBoy, null);
  };

  const clearServiceBoyFilter = () => {
    setSelectedServiceBoy(null);
    applyFilters(null, dateFilter);
  };

  const generateBillNumber = () => {
    const today = new Date();
    const dateStr = `${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`;
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `BILL-${dateStr}-${randomStr}`;
  };

  const validateForm = () => {

    if (!form.serviceType.trim()) {
      Alert.alert('Error', 'Service type is required');
      return false;
    }
    if (!form.serviceboyName.trim()) {
      Alert.alert('Error', 'Engineer name is required');
      return false;
    }
    if (!form.customerName.trim()) {
      Alert.alert('Error', 'Customer name is required');
      return false;
    }
    if (!form.address.trim()) {
      Alert.alert('Error', 'Address is required');
      return false;
    }
    if (!form.contactNumber.trim() || !/^\d{10}$/.test(form.contactNumber)) {
      Alert.alert('Error', 'Valid 10-digit contact number is required');
      return false;
    }
    const serviceChargeValue = parseFloat(form.serviceCharge);
    if (!form.serviceCharge.trim() || isNaN(serviceChargeValue)) {
      Alert.alert('Error', 'Valid service charge is required');
      return false;
    }
    if (paymentMethod === 'cash') {
      const cashGivenValue = parseFloat(cashGiven);
      if (!cashGiven.trim() || isNaN(cashGivenValue)) {
        Alert.alert('Error', 'Valid payment amount is required');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    if (!signature) {
      Alert.alert('Error', 'Customer signature is required');
      return;
    }

    const billNumber = generateBillNumber();
    const now = new Date();
    const serviceChargeValue = parseFloat(form.serviceCharge);
    const commission = (serviceChargeValue * 0.25).toFixed(2);

    const billData = {
      id: billNumber,
      notes: notes.trim() || '',
      billNumber,
      serviceType: form.serviceType,
      serviceboyName: form.serviceboyName,
      customerName: form.customerName,
      contactNumber: form.contactNumber,
      address: form.address,
      serviceCharge: serviceChargeValue.toString(),
      gstPercentage: gstPercentage,
      paymentMethod,
      cashGiven: paymentMethod === 'cash' ? cashGiven : '0',
      change: paymentMethod === 'cash' ? calculateChange() : '0',
      createdAt: now.toISOString(),
      signature: signature,
      status: 'paid',
      total: calculateTotal(),
      date: now.toISOString(),
      userId: 'default-user-id'
    };

  try {
  const response = await fetch(TURSO_BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(billData),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  console.log("✅ Bill saved to DB");
  
  const updatedCounts = await fetchEngineerBillCounts();
  setEngineerCounts(updatedCounts);

  await fetchBills();
  await fetchTotalBillCount();

  const htmlContent = generateBillHtml({
    ...billData,
    engineerCommission: commission,
  });

  let file;
  try {
    file = await Print.printToFileAsync({ html: htmlContent, width: 595, height: 842 });
    console.log("✅ PDF created", file.uri);
  } catch (e) {
    console.error("❌ PDF generation failed", e);
  }

  if (file?.uri) {
    try {
      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share Bill',
        UTI: 'net.whatsapp.pdf',
      });
      console.log("✅ Shared successfully");
    } catch (e) {
      console.error("❌ Sharing failed", e);
    }
  }

  router.push('/rating');
  await CommissionService.refreshAllEngineerSummaries();

  setIsFormVisible(false);
  resetForm();
  setSignature(null);

} catch (error) { }
  };

      const CustomDropdown = ({
        options,
        selectedValue,
        onValueChange,
        placeholder,
        style
    }: {
        options: { label: string; value: string }[];
        selectedValue: string;
        onValueChange: (value: string) => void;
        placeholder: string;
        style?: any;
    }) => {
        const [isOpen, setIsOpen] = useState(false);

        return (
            <View style={[styles.dropdownContainer, style]}>
                <TouchableOpacity
                    style={styles.dropdownHeader}
                    onPress={() => setIsOpen(!isOpen)}
                >
                    <Text style={selectedValue ? styles.dropdownSelectedText : styles.dropdownPlaceholderText}>
                        {selectedValue || placeholder}
                    </Text>
                    <MaterialIcons
                        name={isOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                        size={24}
                    />
                </TouchableOpacity>

                {isOpen && (
                    <View style={styles.dropdownList}>
                        <ScrollView
                            style={styles.dropdownScrollView}
                            nestedScrollEnabled={true}
                        >
                            {options.map((option) => (
                                <TouchableOpacity
                                    key={option.value}
                                    style={styles.dropdownItem}
                                    onPress={() => {
                                        onValueChange(option.value);
                                        setIsOpen(false);
                                    }}
                                >
                                    <Text style={styles.dropdownItemText}>{option.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}
            </View>
        );
    };


  const generateBillHtml = (bill: Bill) => {
    return `
       <html>
              <head>
                <style>
                  html, body {
                    margin: 0;
                    padding: 0;
                    font-family: 'Arial', sans-serif;
                    font-size: 14px;
                    color: #333;
                    height: 100%;
                    box-sizing: border-box;
                    background-color: #f9f9f9;
                  }
                  body {
                    display: flex;
                    flex-direction: column;
                    padding: 30px;
                    max-width: 800px;
                    margin: 0 auto;
                    background: white;
                    box-shadow: 0 0 20px rgba(0,0,0,0.1);
                  }
                  .header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 25px;
                    padding-bottom: 20px;
                    border-bottom: 2px solid #007bff;
                  }
                  .logo-container {
                    display: flex;
                    align-items: center;
                  }
                  .logo {
                    width: 70px;
                    height: auto;
                    margin-right: 15px;
                  }
                  .company-info {
                    text-align: left;
                  }
                  .company-name {
                    font-size: 24px;
                    font-weight: bold;
                    color: #007bff;
                    margin: 0;
                  }
                  .company-tagline {
                    font-size: 12px;
                    color: #666;
                    margin: 3px 0 0;
                  }
                  .invoice-info {
                    text-align: right;
                  }
                  .invoice-title {
                    font-size: 28px;
                    font-weight: bold;
                    color: #2c3e50;
                    margin: 0 0 5px;
                  }
                  .invoice-details {
                    font-size: 13px;
                    color: #555;
                  }
                  .section {
                    margin-bottom: 25px;
                    padding: 15px;
                    background: #f5f9ff;
                    border-radius: 5px;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.05);
                  }
                  .section-title {
                    font-size: 18px;
                    font-weight: bold;
                    margin-bottom: 15px;
                    color: #2c3e50;
                    padding-bottom: 5px;
                    border-bottom: 1px solid #ddd;
                  }
                  .row {
                    display: flex;
                    margin-bottom: 8px;
                  }
                  .label {
                    font-weight: bold;
                    min-width: 150px;
                    color: #555;
                  }
                  .value {
                    flex: 1;
                  }
                  .highlight {
                    color: #007bff;
                    font-weight: bold;
                  }
                  .payment-details {
                    background: #e8f4ff;
                  }
                  .total-row {
                    font-size: 16px;
                    font-weight: bold;
                    margin-top: 10px;
                    padding-top: 10px;
                    border-top: 1px dashed #ccc;
                  }
                  .notes-section {
                    background: #fff8e6;
                    font-style: italic;
                  }
                  .signature-section {
                    margin-top: 30px;
                    text-align: center;
                    padding: 20px 0;
                    border-top: 2px dashed #007bff;
                  }
                  .signature-title {
                    font-weight: bold;
                    margin-bottom: 15px;
                    color: #555;
                  }
                  .signature-image {
                    max-width: 250px;
                    height: 80px;
                    margin: 0 auto;
                  }
                  .footer {
                    text-align: center;
                    margin-top: 30px;
                    font-size: 12px;
                    color: #888;
                    padding-top: 15px;
                    border-top: 1px solid #eee;
                  }
                  .thank-you {
                    font-size: 16px;
                    color: #007bff;
                    margin-bottom: 10px;
                    font-weight: bold;
                  }
                  .contact-info {
                    margin-top: 5px;
                  }
                </style>
              </head>
              <body>
                <div class="header">
                  <div class="logo-container">
                     <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAgAAAAIACAMAAADDpiTIAAABd1BMVEUAAADW6vfR5PHL3evF1uXJ0NvAy9i1xdavusqfqLiNlqd7hJdze49ja4FdZHpUW3JHUGi1v86ZpLWEjaA8RWIuOFUqM1AmL0whLEohK0ohKUojKkakssQiK0wiKkwiKk5pc4mTnrA1Plqkrr0kLlNGV4NKXIdPYo5TZ5U8THVUa5tUbJ4kK0q1v861xdbAy9jF1uXR5PHW6vfa8Pzd8//c9f/L3evd9f7f8/3J0Nvb9v+ttcPtno/wtKnxycLph3XocFnvXzvtTy3uQyL4PRr+PBTk9Prq8OHv6MT025T0z2zs8PT9zUP/yz/7dEZ4KSY6LDb+hFPQQyusNyj7xDqTWEX8vSf3tiXpoirh4+nx2tj7pgr+sgTxycLq6u7/sAIeJUMVHDbsiAuvcTBCGybkLSP1lwzfewggJ0fRGyPACy22DinKYwPDhiaqBizTbgb+jQJSOi/AxdDU19/AxdDa3uX5/P7+/v/////29/r///78/Pzu+P2mbFYWAAAAfXRSTlMABydNc1qT2f///////////9n//////////////////////////////////////////////////////////4b//////////////////////////////////////////////////////////////////////5P////////9/+XfQi4AAHZPSURBVHic7L35tyRXfSf4vfdGRK4v8221SbVKSKUNy24PGIzQgm0BJSFsMBzP9BmmjwdDu+d48JzTf8acsbHPTIMNPt38YHNkFqMNkD2NJBvDQHsBSaUN1a7a35L5co24y3y/90ZERi6vquDZ/TJf5lfwKpfIWO73c7/7/V4GM5pqYtt9AzPaXpoBYMppBoAppxkAppxmAJhymgFgymkGgCmnGQCmnGYAmHKaAWDKaQaAKacZAKacZgCYcpoBYMppBoAppxkAppxmAJhymgFgymkGgCmnGQCmnGYAmHKaAWDKaQaAKacZAKacZgCYcpoBYMppBoAppxkAppxmAJhymgFgymkGgCmnGQCmnGYAmHKaAWDKaQaAKacZAKacZgCYcpoBYMppBoAppxkAppxmAJhymgFgymkGgCmnGQCmnGYAmHKaAWDKaQaAKacZAKacZgCY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" class="logo" alt="Service Vale Logo" />
                    <div class="company-info">
                      <h1 class="company-name">Service Vale</h1>
                      <p class="company-tagline">Quality Service Solutions</p>
                    </div>
                  </div>
                  <div class="invoice-info">
                    <h2 class="invoice-title">INVOICE</h2>
                    <div class="invoice-details">
                      <div><strong>Bill No : </strong> ${bill.billNumber}</div>
                      <div><strong>Date : </strong> ${new Date(bill.createdAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                </div>
                <div class="section">
                  <div class="section-title">Customer Details</div>
                  <div class="row">
                    <span class="label">Customer Name : </span>
                    <span class="value">${bill.customerName}</span>
                  </div>
                  <div class="row">
                    <span class="label">Contact Number : </span>
                    <span class="value">${bill.contactNumber}</span>
                  </div>
                  <div class="row">
                    <span class="label">Address : </span>
                    <span class="value">${bill.address}</span>
                  </div>
                </div>       
                <div class="section">
                  <div class="section-title">Service Details</div>
                  <div class="row">
                    <span class="label">Service Type : </span>
                    <span class="value">${bill.serviceType}</span>
                  </div>
                  <div class="row">
                    <span class="label">Engineer Name : </span>
                    <span class="value">${bill.serviceboyName}</span>
                  </div>
                  <div class="row total-row">
                    <span class="label">Service Charge : </span>
                    <span class="value highlight">₹${bill.serviceCharge}</span>
                  </div>
                  <div class="row total-row">
                    <span class="label">GST (%) : </span>
                    <span class="value highlight">${bill.gstPercentage}%</span>
                  </div>
                  <div class="row total-row">
                    <span class="label">Total : </span>
                    <span class="value highlight">₹${bill.total}</span>
                  </div>
                </div>       
                <div class="section payment-details">
                  <div class="section-title">Payment Details</div>
                  <div class="row">
                    <span class="label">Payment Method : </span>
                    <span class="value highlight">${bill.paymentMethod.toUpperCase()}</span>
                  </div>
                  ${bill.paymentMethod === 'cash' ? `
                  <div class="row">
                    <span class="label">Amount Received : </span>
                    <span class="value">₹${bill.cashGiven}</span>
                  </div>
                  <div class="row">
                    <span class="label">Change Returned : </span>
                    <span class="value">₹${bill.change}</span>
                  </div>
                  ` : ''}
                </div>          
                ${bill?.signature ? `
                  <div class="signature-section">
                    <div class="signature-title">Customer Signature</div>
                    <img src="data:image/png;base64,${bill.signature}" class="signature-image" />
                  </div>
                ` : ''}       
                <div class="footer">
                  <div class="thank-you">Thank You For Your Business!</div>
                  <div class="contact-info">
                    <strong>Contact : </strong> +91 635 320 2602 | 
                    <strong>Email : </strong> info@servicevale.com
                  </div>
                  <div class="address">
                    <strong>Address : </strong> Chowk Bazar Nanpura, Khatkiwad Basir, Jhinga Gali Me
                  </div>
                </div>
              </body>
            </html>
    `;
  };

  const handleShareViaWhatsApp = async () => {
    if (!selectedBill) return;
    try {
      const htmlContent = generateBillHtml(selectedBill);
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        width: 595,
        height: 842,
      });
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share Bill via WhatsApp',
        UTI: 'net.whatsapp.pdf'
      });
    } catch (error) {
      console.error('Error sharing via WhatsApp:', error);
      Alert.alert('Error', 'Failed to share bill');
    }
  };

  const handlePrint = async () => {
    if (!selectedBill) return;
    try {
      const htmlContent = generateBillHtml(selectedBill);
      await Print.printAsync({ html: htmlContent });
    } catch (error) {
      console.error('Error printing:', error);
      Alert.alert('Print Failed', 'Unable to generate PDF');
    }
  };

  const resetForm = () => {
    setForm({
      serviceType: '',
      serviceboyName: '',
      customerName: '',
      address: '',
      contactNumber: '',
      serviceCharge: '',
    });
    setPaymentMethod('cash');
    setCashGiven('');
    setNotes('');
  };

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const calculateTotal = () => {
    const charge = parseFloat(form.serviceCharge) || 0;
    const gst = parseFloat(gstPercentage) || 0;
    const total = charge + (charge * gst / 100);
    return total.toFixed(2);
  };

  const calculateChange = () => {
    const total = parseFloat(calculateTotal()) || 0;
    const given = parseFloat(cashGiven) || 0;
    return given > total ? (given - total).toFixed(2) : '0.00';
  };

  const toggleFormVisibility = () => {
    setIsFormVisible(!isFormVisible);
    if (!isFormVisible) {
      resetForm();
    }
  };

  const showBillDetails = (bill: Bill) => {
    setSelectedBill(bill);
    setIsBillDetailVisible(true);
  };

  const closeBillDetails = () => {
    setIsBillDetailVisible(false);
    setSelectedBill(null);
  };

  const handleSignature = (signatureData: string) => {
    const base64Data = signatureData.replace('data:image/png;base64,', '');
    setSignature(base64Data);
    setIsSignatureVisible(false);
  };

  const handleDeleteBill = async (id: string) => {
    Alert.alert(
      'Delete Bill',
      'Are you sure you want to delete this bill?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              await fetch(`${TURSO_BASE_URL}/${id}`, {
                method: 'DELETE'
              });

              const counts = await fetchEngineerBillCounts();
              setEngineerCounts(counts);

              fetchBills();
              fetchTotalBillCount();

              closeBillDetails();
              Alert.alert('Success', 'Bill deleted successfully.');
            } catch (error) {
              console.error('Error deleting bill:', error);
              Alert.alert('Error', 'Failed to delete bill');
            }
          }
        }
      ]
    );
  };

  const toggleBillSelection = (id: string) => {
    setSelectedBills(prev =>
      prev.includes(id)
        ? prev.filter(billId => billId !== id)
        : [...prev, id]
    );
  };

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    if (isSelectionMode) {
      setSelectedBills([]);
    }
  };

  const handleDeleteMultiple = async () => {
    if (selectedBills.length === 0) return;

    Alert.alert(
      'Delete Bills',
      `Are you sure you want to delete ${selectedBills.length} bill(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              await Promise.all(
                selectedBills.map(id =>
                  fetch(`${TURSO_BASE_URL}/${id}`, { method: 'DELETE' })
                )
              );

              const counts = await fetchEngineerBillCounts();
              setEngineerCounts(counts);
              fetchBills();
              fetchTotalBillCount();

              setSelectedBills([]);
              setIsSelectionMode(false);

              Alert.alert('Success', `${selectedBills.length} bill(s) deleted successfully.`);
            } catch (error) {
              console.error('Error deleting bills:', error);
              Alert.alert('Error', 'Failed to delete bills');
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {isSelectionMode ? (
            <TouchableOpacity onPress={toggleSelectionMode}>
              <Feather name="x" size={25} color="#FFF" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => router.push('/home')}>
              <Feather name="arrow-left" size={25} color="#FFF" />
            </TouchableOpacity>
          )}
          <View>
            <Text style={styles.headerTitle}>
              {isSelectionMode ? `${selectedBills.length} selected` : 'Bill Management'}
            </Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          {isSelectionMode ? (
            <TouchableOpacity onPress={handleDeleteMultiple} style={styles.deleteButton}>
              <Feather name="trash-2" size={22} color="#FFF" />
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity onPress={toggleSelectionMode} style={styles.selectButton}>
                <Feather name="check-square" size={22} color="#FFF" />
              </TouchableOpacity>
              <View style={styles.headerCount}>
                <Text style={styles.headerCountText}>{totalBillCount}</Text>
              </View>
            </>
          )}
        </View>
      </View>

      {!isFormVisible ? (
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterButton, selectedServiceBoy && styles.activeFilter]}
            onPress={() => {
              setFilterType('serviceBoy');
              setFilterModalVisible(true);
            }}
          >
            <MaterialIcons name="engineering" size={20} color={selectedServiceBoy ? "#FFF" : "#5E72E4"} />
            <Text style={[styles.filterButtonText, selectedServiceBoy && styles.activeFilterText]}>
              {selectedServiceBoy ? selectedServiceBoy : 'Filter by Engineer'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, dateFilter && styles.activeFilter]}
            onPress={() => setShowDatePicker(true)}
          >
            <MaterialIcons name="today" size={20} color={dateFilter ? "#FFF" : "#5E72E4"} />
            <Text style={[styles.filterButtonText, dateFilter && styles.activeFilterText]}>
              {dateFilter ? format(dateFilter, 'dd MMM yyyy') : 'Filter by date'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {(selectedServiceBoy || dateFilter) && (
        <View style={styles.activeFiltersContainer}>
          {selectedServiceBoy && (
            <View style={styles.filterChip}>
              <Text style={styles.filterChipText}>{selectedServiceBoy}</Text>
              <TouchableOpacity onPress={clearServiceBoyFilter}>
                <Feather name="x" size={16} color="#FFF" />
              </TouchableOpacity>
            </View>
          )}
          {dateFilter && (
            <View style={styles.filterChip}>
              <Text style={styles.filterChipText}>{format(dateFilter, 'dd MMM yyyy')}</Text>
              <TouchableOpacity onPress={clearDateFilter}>
                <Feather name="x" size={16} color="#FFF" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {showDatePicker && (
        <DateTimePicker
          value={dateFilter || new Date()}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}

      {!isFormVisible && (
        <View style={styles.searchContainer}>
          <TextInput
            placeholder="Search"
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              applyFilters(selectedServiceBoy, dateFilter);
            }}
          />
          <Feather
            name="search"
            size={20}
            color="#A0AEC0"
            style={styles.searchIcon}
          />
          {searchQuery ? (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery('');
                applyFilters(selectedServiceBoy, dateFilter);
              }}
              style={styles.clearSearchButton}
            >
              <Feather name="x" size={18} color="#A0AEC0" />
            </TouchableOpacity>
          ) : null}
        </View>
      )}

      <Modal
        animationType="slide"
        transparent={true}
        visible={filterModalVisible}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalContainer1}>
          <View style={styles.modalContent1}>
            <Text style={styles.modalTitle1}>Select Service Engineer</Text>
            <FlatList
              style={{ maxHeight: '90%' }}
              contentContainerStyle={styles.scrollContent}
              data={[{ id: 'all', name: 'All Service Engineers' }, ...serviceBoys]}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const billCounts = countBillsByServiceBoy();
                const count = billCounts[item.name] || 0;
                return (
                  <TouchableOpacity
                    style={styles.serviceCard}
                    onPress={() => filterServices(item.name === 'All Service Engineers' ? null : item.name)}
                  >
                    <View style={styles.serviceHeader}>
                      <Text style={styles.serviceType}>{item.name}</Text>
                      <View style={[styles.statusBadge, styles.pendingBadge]}>
                        <Text style={styles.statusText}>
                          {count} Bills
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              }}
              showsVerticalScrollIndicator={true}
            />
            <TouchableOpacity
              style={styles.modalCloseButton1}
              onPress={() => setFilterModalVisible(false)}
            >
              <Text style={styles.modalCloseButtonText1}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {isFormVisible ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={[styles.scrollContainer, { paddingBottom: 150 }]} keyboardShouldPersistTaps="handled">
            <View style={styles.formContainer}>
              <Text style={styles.sectionTitle1}>Service Details</Text>
                   {/* Service Type Dropdown */}
                        <View style={styles.formGroup}>
                            <Text style={styles.inputLabel}>Service Type*</Text>
                            <CustomDropdown
                                options={SERVICE_TYPES.map(type => ({ label: type, value: type }))}
                                selectedValue={form.serviceType}
                                onValueChange={(value) => handleChange('serviceType', value)}
                                placeholder="Select service type"
                            />
                        </View>

                        {/* Engineer Name Dropdown */}
                        <View style={styles.formGroup}>
                            <Text style={styles.inputLabel}>Engineer Name*</Text>
                            <CustomDropdown
                                options={serviceBoys.map(boy => ({ label: boy.name, value: boy.name }))}
                                selectedValue={form.serviceboyName}
                                onValueChange={(value) => handleChange('serviceboyName', value)}
                                placeholder="Select engineer"
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.inputLabel}>Customer Name*</Text>
                            <TextInput
                  style={styles.input}
                                value={form.customerName}
                                onChangeText={(text) => handleChange('customerName', text)}
                                placeholder="Enter customer name"
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.inputLabel}>Contact Number*</Text>
                            <TextInput
                  style={styles.input}
                                value={form.contactNumber}
                                onChangeText={(text) => handleChange('contactNumber', text)}
                                placeholder="Enter contact number"
                                keyboardType="numeric"
                                maxLength={10}
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.inputLabel}>Address*</Text>
                            <TextInput
                  style={styles.input}
                                value={form.address}
                                onChangeText={(text) => handleChange('address', text)}
                                placeholder="Enter address"
                                multiline
                                numberOfLines={3}
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.inputLabel}>Service Charge (₹)*</Text>
                            <TextInput
                  style={styles.input}
                                value={form.serviceCharge.toString()}
                                onChangeText={(text) => handleChange('serviceCharge', text)}
                                placeholder="Enter service charge"
                                keyboardType="decimal-pad"
                            />
                        </View>


              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>GST (%)</Text>
                <TextInput
                  placeholder="Enter GST percentage"
                  style={styles.input}
                  keyboardType="numeric"
                  value={gstPercentage}
                  onChangeText={setGstPercentage}
                />
              </View>

              <View style={styles.paymentSummary}>
                <View style={[styles.summaryRow]}>
                  <Text style={styles.summaryLabel}>Total Amount :</Text>
                  <Text style={styles.summaryValue}>₹{calculateTotal()}</Text>
                </View>
              </View>

              <Text style={styles.sectionTitle}>Additional Notes (Optional)</Text>
              <TextInput
                placeholder="Enter any additional notes"
                style={[styles.input1, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={4}
                maxLength={500}
              />

              <Text style={styles.sectionTitle}>Payment Method</Text>
              <View style={styles.paymentMethodContainer}>
                <TouchableOpacity
                  style={[styles.methodButton, paymentMethod === 'cash' && styles.methodButtonActive]}
                  onPress={() => setPaymentMethod('cash')}
                >
                  <MaterialIcons
                    name="payments"
                    size={20}
                    color={paymentMethod === 'cash' ? '#FFF' : '#5E72E4'}
                  />
                  <Text style={[styles.methodText, paymentMethod === 'cash' && styles.methodTextActive]}>
                    Cash
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.methodButton, paymentMethod === 'upi' && styles.methodButtonActive]}
                  onPress={() => setPaymentMethod('upi')}
                >
                  <MaterialIcons
                    name="qr-code-scanner"
                    size={20}
                    color={paymentMethod === 'upi' ? '#FFF' : '#5E72E4'}
                  />
                  <Text style={[styles.methodText, paymentMethod === 'upi' && styles.methodTextActive]}>
                    UPI
                  </Text>
                </TouchableOpacity>
              </View>

              {paymentMethod === 'cash' && (
                <View style={styles.cashPaymentContainer}>
                  <Text style={styles.sectionTitle}>Cash Payment</Text>
                  <TextInput
                    placeholder="Amount Given by Customer"
                    style={styles.input1}
                    keyboardType="numeric"
                    value={cashGiven}
                    onChangeText={setCashGiven}
                  />
                  <View style={styles.changeContainer}>
                    <Text style={styles.changeLabel}>Change Return by Engineer :</Text>
                    <Text style={styles.changeValue}>₹{calculateChange()}</Text>
                  </View>
                </View>
              )}

              {signature ? (
                <View style={styles.signatureContainer}>
                  <Text style={styles.signatureLabel}>Customer Signature</Text>
                  <Image
                    source={{ uri: `data:image/png;base64,${signature}` }}
                    style={styles.signatureImage}
                  />
                  <TouchableOpacity
                    style={styles.changeSignatureButton}
                    onPress={() => setIsSignatureVisible(true)}
                  >
                    <Text style={styles.changeSignatureText}>Change Signature</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.addSignatureButton}
                  onPress={() => setIsSignatureVisible(true)}
                >
                  <Feather name="edit" size={20} color="#5E72E4" />
                  <Text style={styles.addSignatureText}>Add Customer Signature</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSubmit}
              >
                <Text style={styles.submitText}>Submit & Share Bill</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <View style={styles.billsListContainer}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#5E72E4" />
            </View>
          ) : bills.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="receipt-long" size={50} color="#A0AEC0" />
              <Text style={styles.emptyText}>
                {dateFilter
                  ? `No bills on ${format(dateFilter, 'MMMM d, yyyy')}`
                  : 'No bills generated'
                }
              </Text>
              <Text style={styles.emptySubtext}>Go to "Completed Services" and generate a bill</Text>
            </View>
          ) : (
            <FlatList
              data={bills}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.billCard,
                    isSelectionMode && styles.billCardSelectable,
                    selectedBills.includes(item.id) && styles.billCardSelected
                  ]}
                  onPress={() => {
                    if (isSelectionMode) {
                      toggleBillSelection(item.id);
                    } else {
                      showBillDetails(item);
                    }
                  }}
                  onLongPress={() => {
                    toggleSelectionMode();
                    toggleBillSelection(item.id);
                  }}
                >
                  {isSelectionMode && (
                    <Checkbox
                      status={selectedBills.includes(item.id) ? 'checked' : 'unchecked'}
                      onPress={() => toggleBillSelection(item.id)}
                      color="#5E72E4"
                    />
                  )}
                  <View style={styles.billContent}>
                    <View style={styles.billHeader}>
                      <View style={styles.billInfo}>
                        <Text style={styles.billCustomer}>{item.customerName}</Text>
                        <Text style={styles.billService}>{item.serviceType}</Text>
                        <Text style={styles.billNumber}>{item.billNumber}</Text>
                      </View>
                      <View style={styles.billAmountContainer}>
                        <Text style={styles.billAmount}>₹{item.total}</Text>
                      </View>
                    </View>
                    <View style={styles.billDateContainer}>
                      <MaterialCommunityIcons name="calendar" size={14} color="#718096" />
                      <Text style={styles.billDate}>
                        {formatToAmPm(item.date)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )}
              style={{ flex: 1 }}
              contentContainerStyle={styles.billsListContent}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons name="file-document-outline" size={48} color="#A0AEC0" />
                  <Text style={styles.emptyText}>
                    {dateFilter
                      ? `No bills on ${format(dateFilter, 'MMMM d, yyyy')}`
                      : 'No bills generated'
                    }
                  </Text>
                  <Text style={styles.emptySubtext}>Go to "Completed Services" and generate a bill</Text>
                </View>
              }
              ListFooterComponent={
                isLoadingMore ? (
                  <View style={styles.loadingMoreContainer}>
                    <ActivityIndicator size="small" color="#5E72E4" />
                    <Text style={styles.loadingMoreText}>Loading more services...</Text>
                  </View>
                ) : null
              }
              onEndReached={() => {
                if (!isLoadingMore && currentPage < totalPages) {
                  fetchBills(currentPage + 1, true);
                }
              }}
              showsVerticalScrollIndicator={false}
              onEndReachedThreshold={0.5}
              refreshing={isLoading}
              onRefresh={() => fetchBills(1)}
            />
          )}
        </View>
      )}

      <Modal
        visible={isBillDetailVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeBillDetails}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {selectedBill && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Bill Information</Text>
                  <TouchableOpacity onPress={closeBillDetails}>
                    <Feather name="x" size={25} color="#2D3748" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalContent}>
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Bill Details</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Bill Number :</Text>
                      <Text style={styles.detailValue}>{selectedBill.billNumber}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Date :</Text>
                      <Text style={styles.detailValue}>
                        {formatToAmPm(selectedBill.createdAt || '')}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Customer Details</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Name :</Text>
                      <Text style={styles.detailValue}>{selectedBill.customerName}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Contact :</Text>
                      <Text style={styles.detailValue}>{selectedBill.contactNumber}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Address :</Text>
                      <Text style={styles.detailValue}>{selectedBill.address}</Text>
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Service Details</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Service Type :</Text>
                      <Text style={styles.detailValue}>{selectedBill.serviceType}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Service Engineer :</Text>
                      <Text style={styles.detailValue}>{selectedBill.serviceboyName}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Service Charge :</Text>
                      <Text style={styles.detailValue}>₹{selectedBill.serviceCharge}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>GST (%) :</Text>
                      <Text style={styles.detailValue}>{selectedBill.gstPercentage || '0'}%</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Total :</Text>
                      <Text style={styles.detailValue}>₹{selectedBill.total}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Engineer Commission :</Text>
                      <Text style={styles.detailValue}>
                        ₹{(parseFloat(selectedBill.serviceCharge) * 0.25).toFixed(2)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Payment Details</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Payment Method :</Text>
                      <Text style={styles.detailValue}>{selectedBill.paymentMethod.toUpperCase()}</Text>
                    </View>
                    {selectedBill.paymentMethod === 'cash' && (
                      <>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Cash Received :</Text>
                          <Text style={styles.detailValue}>₹{selectedBill.cashGiven}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Change Returned :</Text>
                          <Text style={styles.detailValue}>₹{selectedBill.change}</Text>
                        </View>
                      </>
                    )}
                  </View>

                  {selectedBill.notes && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>Additional Notes</Text>
                      <Text style={styles.notesText}>{selectedBill.notes}</Text>
                    </View>
                  )}

                  {selectedBill?.signature && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>Customer Signature</Text>
                      <Image
                        source={{ uri: `data:image/png;base64,${selectedBill.signature}` }}
                        style={styles.signatureImage}
                      />
                    </View>
                  )}

                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.printButton]}
                      onPress={handlePrint}
                    >
                      <MaterialIcons name="print" size={20} color="#FFF" />
                      <Text style={styles.actionButtonText}>Print</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.whatsappButton]}
                      onPress={handleShareViaWhatsApp}
                    >
                      <MaterialIcons name="share" size={20} color="#FFF" />
                      <Text style={styles.actionButtonText}>Share</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.rateButton]}
                      onPress={() => router.push('/rating')}
                    >
                      <MaterialIcons name="star" size={20} color="#FFF" />
                      <Text style={styles.actionButtonText}>Rate</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.deleteButton]}
                      onPress={() => handleDeleteBill(selectedBill.id)}
                    >
                      <MaterialIcons name="delete" size={20} color="#FFF" />
                      <Text style={styles.actionButtonText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={isSignatureVisible}
        onRequestClose={() => setIsSignatureVisible(false)}
      >
        <View style={styles.signatureModalContainer}>
          <View style={styles.signatureModalContent}>
            <View style={styles.signatureModalHeader}>
              <Text style={styles.signatureModalTitle}>Customer Signature</Text>
              <TouchableOpacity onPress={() => setIsSignatureVisible(false)}>
                <Feather name="x" size={25} color="#718096" />
              </TouchableOpacity>
            </View>
            <View style={styles.signatureCanvasContainer}>
              <SignatureScreen
                onOK={handleSignature}
                onEmpty={() => Alert.alert('Error', 'Please provide a signature')}
                descriptionText=""
                clearText="Clear"
                confirmText="Save"
                webStyle={`
                    .m-signature-pad {
                      box-shadow: none;
                      border: none;
                      margin: 0;
                      padding: 0;
                      height: 100%;
                    }
                    .m-signature-pad--body {
                      border: none;
                      height: calc(100% - 60px);
                    }
                    .m-signature-pad--footer {
                      height: 60px;
                      margin: 0;
                      padding: 10px;
                      background: white;
                    }
                    body, html {
                      background-color: #fff;
                      margin: 0;
                      padding: 0;
                      height: 100%;
                    }
                    canvas {
                      background-color: #fff;
                    }
                  `}
              />
            </View>
          </View>
        </View>
      </Modal>

      <TouchableOpacity
        style={styles.fab}
        onPress={toggleFormVisibility}
      >
        <Feather name={isFormVisible ? 'x' : 'plus'} size={24} color="#FFF" />
      </TouchableOpacity>

      <View style={[footerStyles.bottomBar, { paddingBottom: insets.bottom || 20, marginTop: 40 }]}>
        <TouchableOpacity
          style={footerStyles.bottomButton}
          onPress={() => router.push('/service')}
        >
          <View style={footerStyles.bottomButtonIcon}>
            <MaterialIcons name="construction" size={20} color="#5E72E4" />
          </View>
          <Text style={footerStyles.bottomButtonText}>Service</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={footerStyles.bottomButton}
          onPress={() => router.push('/user')}
        >
          <View style={footerStyles.bottomButtonIcon}>
            <MaterialIcons name="engineering" size={20} color="#5E72E4" />
          </View>
          <Text style={footerStyles.bottomButtonText}>Engineers</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[footerStyles.bottomButton]}
          onPress={() => router.push('/home')}
        >
          <View style={[footerStyles.bottomButtonIcon]}>
            <Feather name="home" size={20} color="#5E72E4" />
          </View>
          <Text style={[footerStyles.bottomButtonText]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={footerStyles.bottomButton}
          onPress={() => router.push('/userphotos')}
        >
          <View style={footerStyles.bottomButtonIcon}>
            <MaterialIcons name="photo-library" size={20} color="#5E72E4" />
          </View>
          <Text style={footerStyles.bottomButtonText}>Photos</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[footerStyles.bottomButton, footerStyles.bottomButtonActive]}
          onPress={() => router.push('/bill')}
        >
          <View style={[footerStyles.bottomButtonIcon, footerStyles.bottomButtonIconActive]}>
            <Feather name="file-text" size={25} color="#FFF" />
          </View>
          <Text style={[footerStyles.bottomButtonText, footerStyles.bottomButtonTextActive]}>Bills</Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
};

export default BillPage;