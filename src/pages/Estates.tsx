import React, { useState, useEffect, useMemo } from 'react';
import {
  collection,
  query,
  addDoc,
  where,
  serverTimestamp,
  onSnapshot,
  updateDoc,
  doc,
  getDocs,
  getDoc,
  or
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import {
  Building2,
  Plus,
  Search,
  Users,
  CreditCard,
  Bell,
  Clock,
  Check,
  X,
  Shield,
  ShieldOff,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { MembersModal } from '@/components/MembersModal';

interface Estate {
  id: string;
  name: string;
  address: string;
  type: string;
  memberCount: number;
  createdAt: any;
  members: string[];
  createdBy: string;
  admins: string[];
  invitedUsers?: string[];
}

interface Member {
  id: string;
  displayName: string;
  email: string;
  photoURL: string;
  isAdmin: boolean;
}

const Estates = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [estates, setEstates] = useState<Estate[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showChargeModal, setShowChargeModal] = useState(false);
  const [selectedEstate, setSelectedEstate] = useState<Estate | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newEstate, setNewEstate] = useState({
    name: '',
    address: '',
    type: 'residential'
  });
  const [newCharge, setNewCharge] = useState({
    title: '',
    amount: 0,
    dueDate: '',
    description: ''
  });

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    const estatesQuery = query(
      collection(db, 'estates'),
      or(
        where('members', 'array-contains', currentUser.uid),
        where('invitedUsers', 'array-contains', currentUser.uid)
      )
    );

    const unsubscribe = onSnapshot(estatesQuery, (snapshot) => {
      const estatesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        admins: doc.data().admins || [],
        members: doc.data().members || []
      })) as Estate[];
      setEstates(estatesData);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, navigate]);

  const handleCreateEstate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      const estateData = {
        ...newEstate,
        memberCount: 1,
        members: [currentUser.uid],
        admins: [currentUser.uid],
        createdBy: currentUser.uid,
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'estates'), estateData);

      await addDoc(collection(db, 'notifications'), {
        type: 'estate',
        title: 'Estate Created',
        message: `You have successfully created ${newEstate.name}`,
        userId: currentUser.uid,
        estateId: docRef.id,
        read: false,
        createdAt: serverTimestamp()
      });

      setShowCreateModal(false);
      setNewEstate({ name: '', address: '', type: 'residential' });
      toast.success('Estate created successfully');
      navigate(`/dashboard`);
    } catch (error) {
      console.error('Error creating estate:', error);
      toast.error('Failed to create estate');
    }
  };

  const handleViewMembers = async (estate: Estate) => {
    if (!estate.members || !estate.admins) {
      toast.error('Invalid estate data');
      return;
    }

    setSelectedEstate(estate);
    try {
      const memberPromises = estate.members.map(async (userId) => {
        const userDoc = await getDoc(doc(db, 'users', userId));
        const userData = userDoc.data();
        return {
          id: userId,
          displayName: userData?.displayName || 'Unknown User',
          email: userData?.email || '',
          photoURL: userData?.photoURL || '',
          isAdmin: estate.admins.includes(userId)
        };
      });

      const memberData = await Promise.all(memberPromises);
      setMembers(memberData);
      setShowMembersModal(true);
    } catch (error) {
      console.error('Error fetching members:', error);
      toast.error('Failed to load members');
    }
  };

  const toggleAdminStatus = async (memberId: string) => {
    if (!selectedEstate || !currentUser || !selectedEstate.admins) return;
    
    if (selectedEstate.createdBy !== currentUser.uid) {
      toast.error('Only the estate creator can modify admin status');
      return;
    }

    try {
      const estateRef = doc(db, 'estates', selectedEstate.id);
      const newAdmins = selectedEstate.admins.includes(memberId)
        ? selectedEstate.admins.filter(id => id !== memberId)
        : [...selectedEstate.admins, memberId];

      await updateDoc(estateRef, { admins: newAdmins });

      setMembers(prev =>
        prev.map(member =>
          member.id === memberId
            ? { ...member, isAdmin: !member.isAdmin }
            : member
        )
      );

      await addDoc(collection(db, 'notifications'), {
        type: 'estate',
        title: 'Admin Status Update',
        message: `Your admin status in ${selectedEstate.name} has been ${
          newAdmins.includes(memberId) ? 'granted' : 'revoked'
        }`,
        userId: memberId,
        estateId: selectedEstate.id,
        read: false,
        createdAt: serverTimestamp()
      });

      toast.success('Admin status updated successfully');
    } catch (error) {
      console.error('Error updating admin status:', error);
      toast.error('Failed to update admin status');
    }
  };

  const handleCreateCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEstate || !currentUser) return;

    if (!selectedEstate.admins?.includes(currentUser.uid)) {
      toast.error('Only admins can create service charges');
      return;
    }

    try {
      const charge = {
        estateId: selectedEstate.id,
        ...newCharge,
        status: 'pending',
        createdAt: serverTimestamp(),
        createdBy: currentUser.uid
      };

      await addDoc(collection(db, 'serviceCharges'), charge);

      const notifications = selectedEstate.members.map(memberId => ({
        userId: memberId,
        type: 'payment',
        title: 'New Service Charge',
        message: `A new service charge of ₦${newCharge.amount.toLocaleString()} has been added to ${selectedEstate.name}`,
        read: false,
        createdAt: serverTimestamp()
      }));

      await Promise.all(
        notifications.map(notification =>
          addDoc(collection(db, 'notifications'), notification)
        )
      );

      setShowChargeModal(false);
      setNewCharge({ title: '', amount: 0, dueDate: '', description: '' });
      toast.success('Service charge created successfully');
    } catch (error) {
      console.error('Error creating service charge:', error);
      toast.error('Failed to create service charge');
    }
  };

  if (!currentUser) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <Building2 className="h-8 w-8 text-indigo-600" />
          <h1 className="ml-3 text-2xl font-semibold text-gray-900">My Estates</h1>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          <Plus className="h-5 w-5 mr-2" />
          Create Estate
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {estates.map(estate => {
          const isAdmin = estate.admins?.includes(currentUser.uid) || false;
          
          return (
            <div
              key={estate.id}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{estate.name}</h3>
                  <p className="text-sm text-gray-500">{estate.address}</p>
                </div>
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800">
                  {estate.type}
                </span>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => handleViewMembers(estate)}
                  className="flex items-center text-sm text-indigo-600 hover:text-indigo-800"
                >
                  <Users className="h-4 w-4 mr-2" />
                  {estate.memberCount} {estate.memberCount === 1 ? 'member' : 'members'}
                </button>
                <div className="flex items-center text-sm text-gray-500">
                  <Clock className="h-4 w-4 mr-2" />
                  Created {new Date(estate.createdAt?.seconds * 1000).toLocaleDateString()}
                </div>
              </div>

              <div className="mt-6 flex space-x-3">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  View Dashboard
                </button>
                {isAdmin && (
                  <>
                    <button
                      onClick={() => {
                        setSelectedEstate(estate);
                        setShowChargeModal(true);
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                      title="Create Service Charge"
                    >
                      <CreditCard className="h-5 w-5 text-gray-500" />
                    </button>
                    <button
                      onClick={() => navigate('/admin')}
                      className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                      title="Admin Panel"
                    >
                      <Shield className="h-5 w-5 text-gray-500" />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {estates.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No estates</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new estate.</p>
          <div className="mt-6">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create Estate
            </button>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Create New Estate</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleCreateEstate}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Estate Name</label>
                  <input
                    type="text"
                    value={newEstate.name}
                    onChange={(e) => setNewEstate({ ...newEstate, name: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Address</label>
                  <input
                    type="text"
                    value={newEstate.address}
                    onChange={(e) => setNewEstate({ ...newEstate, address: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Type</label>
                  <select
                    value={newEstate.type}
                    onChange={(e) => setNewEstate({ ...newEstate, type: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    <option value="residential">Residential</option>
                    <option value="commercial">Commercial</option>
                    <option value="mixed">Mixed Use</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
                >
                  Create Estate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showChargeModal && selectedEstate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Create Service Charge</h2>
              <button
                onClick={() => setShowChargeModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleCreateCharge}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Title</label>
                  <input
                    type="text"
                    value={newCharge.title}
                    onChange={(e) => setNewCharge({ ...newCharge, title: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Amount (₦)</label>
                  <input
                    type="number"
                    value={newCharge.amount}
                    onChange={(e) => setNewCharge({ ...newCharge, amount: Number(e.target.value) })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    min="0"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Due Date</label>
                  <input
                    type="date"
                    value={newCharge.dueDate}
                    onChange={(e) => setNewCharge({ ...newCharge, dueDate: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={newCharge.description}
                    onChange={(e) => setNewCharge({ ...newCharge, description: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    rows={3}
                    required
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowChargeModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
                >
                  Create Charge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <MembersModal
        open={showMembersModal}
        onOpenChange={setShowMembersModal}
        members={members}
        onToggleAdmin={toggleAdminStatus}
        currentUserId={currentUser?.uid}
        isCreator={selectedEstate?.createdBy === currentUser?.uid}
      />
    </div>
  );
};

export default Estates;