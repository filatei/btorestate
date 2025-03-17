import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  addDoc,
  where,
  serverTimestamp,
  onSnapshot,
  updateDoc,
  doc,
  getDocs
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import { Building2, Plus, Search, Users, CreditCard, Bell } from 'lucide-react';
import toast from 'react-hot-toast';

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
}

interface ServiceCharge {
  id: string;
  estateId: string;
  title: string;
  amount: number;
  dueDate: Date;
  description: string;
  createdAt: any;
  status: 'pending' | 'paid' | 'partial';
  paidAmount: number;
}

const columnHelper = createColumnHelper<Estate>();

const Estates = () => {
  const { currentUser } = useAuth();
  const [estates, setEstates] = useState<Estate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showChargeModal, setShowChargeModal] = useState(false);
  const [selectedEstate, setSelectedEstate] = useState<Estate | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [newCharge, setNewCharge] = useState({
    title: '',
    amount: 0,
    dueDate: '',
    description: ''
  });
  const [newEstate, setNewEstate] = useState({
    name: '',
    address: '',
    type: 'residential'
  });

  const isAdmin = (estate: Estate) => {
    return estate.admins?.includes(currentUser?.uid || '') || estate.createdBy === currentUser?.uid;
  };

  const columns = [
    columnHelper.accessor('name', {
      header: 'Name',
      cell: info => <div className="font-medium">{info.getValue()}</div>
    }),
    columnHelper.accessor('type', {
      header: 'Type',
      cell: info => (
        <span className="capitalize px-2 py-1 bg-gray-100 rounded-full text-sm">
          {info.getValue()}
        </span>
      )
    }),
    columnHelper.accessor('address', {
      header: 'Address',
    }),
    columnHelper.accessor('memberCount', {
      header: 'Members',
      cell: info => <div className="text-center">{info.getValue()}</div>
    }),
    columnHelper.accessor('createdAt', {
      header: 'Created',
      cell: info => {
        const date = info.getValue()?.toDate();
        return date ? new Date(date).toLocaleDateString() : '-';
      }
    }),
    columnHelper.display({
      id: 'actions',
      cell: info => {
        const estate = info.row.original;
        const isMember = estate.members.includes(currentUser?.uid || '');
        const isEstateAdmin = isAdmin(estate);

        return (
          <div className="flex items-center space-x-2">
            {!isMember && (
              <button
                onClick={() => handleJoinEstate(estate)}
                className="text-indigo-600 hover:text-indigo-800"
              >
                Join
              </button>
            )}
            {isEstateAdmin && (
              <>
                <button
                  onClick={() => handleOpenInvite(estate)}
                  className="text-green-600 hover:text-green-800"
                >
                  <Users className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleOpenCharge(estate)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <CreditCard className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleSendNotification(estate)}
                  className="text-purple-600 hover:text-purple-800"
                >
                  <Bell className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        );
      }
    })
  ];

  const table = useReactTable({
    data: estates,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      globalFilter
    },
    onGlobalFilterChange: setGlobalFilter,
  });

  useEffect(() => {
    if (!currentUser) return;

    const estatesQuery = query(collection(db, 'estates'));
    
    const unsubscribe = onSnapshot(estatesQuery, (snapshot) => {
      const estatesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Estate[];
      setEstates(estatesData);
      setIsLoading(false);
    }, (error) => {
      console.error('Error fetching estates:', error);
      toast.error('Failed to load estates');
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleCreateEstate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      const optimisticEstate: Estate = {
        id: 'temp-' + Date.now(),
        ...newEstate,
        createdBy: currentUser.uid,
        createdAt: new Date(),
        memberCount: 1,
        members: [currentUser.uid],
        admins: [currentUser.uid]
      };

      setEstates(prev => [...prev, optimisticEstate]);
      setShowCreateModal(false);

      await addDoc(collection(db, 'estates'), {
        ...newEstate,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        memberCount: 1,
        members: [currentUser.uid],
        admins: [currentUser.uid]
      });

      setEstates(prev => prev.filter(e => e.id !== optimisticEstate.id));
      toast.success('Estate created successfully');
    } catch (error) {
      console.error('Error creating estate:', error);
      toast.error('Failed to create estate');
      setEstates(prev => prev.filter(e => !e.id.startsWith('temp-')));
    }
  };

  const handleJoinEstate = async (estate: Estate) => {
    if (!currentUser || estate.members.includes(currentUser.uid)) return;

    try {
      const updatedEstate = {
        ...estate,
        members: [...estate.members, currentUser.uid],
        memberCount: estate.memberCount + 1
      };

      setEstates(prev =>
        prev.map(e => (e.id === estate.id ? updatedEstate : e))
      );

      const estateRef = doc(db, 'estates', estate.id);
      await updateDoc(estateRef, {
        members: [...estate.members, currentUser.uid],
        memberCount: estate.memberCount + 1
      });

      toast.success('Successfully joined the estate');
    } catch (error) {
      console.error('Error joining estate:', error);
      toast.error('Failed to join estate');
      setEstates(prev =>
        prev.map(e => (e.id === estate.id ? estate : e))
      );
    }
  };

  const handleOpenInvite = (estate: Estate) => {
    setSelectedEstate(estate);
    setShowInviteModal(true);
  };

  const handleOpenCharge = (estate: Estate) => {
    setSelectedEstate(estate);
    setShowChargeModal(true);
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEstate || !currentUser) return;

    try {
      const usersQuery = query(
        collection(db, 'users'),
        where('email', '==', inviteEmail)
      );
      const userSnapshot = await getDocs(usersQuery);
      
      if (userSnapshot.empty) {
        toast.error('User not found');
        return;
      }

      const userId = userSnapshot.docs[0].id;

      const estateRef = doc(db, 'estates', selectedEstate.id);
      await updateDoc(estateRef, {
        members: [...selectedEstate.members, userId],
        memberCount: selectedEstate.memberCount + 1
      });

      await addDoc(collection(db, 'notifications'), {
        userId,
        type: 'estate',
        title: 'Estate Invitation',
        message: `You have been invited to join ${selectedEstate.name}`,
        read: false,
        createdAt: serverTimestamp()
      });

      setShowInviteModal(false);
      setInviteEmail('');
      toast.success('Invitation sent successfully');
    } catch (error) {
      console.error('Error inviting member:', error);
      toast.error('Failed to send invitation');
    }
  };

  const handleCreateCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEstate || !currentUser) return;

    try {
      const charge: Partial<ServiceCharge> = {
        estateId: selectedEstate.id,
        ...newCharge,
        status: 'pending',
        paidAmount: 0,
        createdAt: serverTimestamp(),
        createdBy: currentUser.uid
      };

      await addDoc(collection(db, 'serviceCharges'), charge);

      const notifications = selectedEstate.members.map(memberId => ({
        userId: memberId,
        type: 'payment',
        title: 'New Service Charge',
        message: `A new service charge of ₦${newCharge.amount} has been added to ${selectedEstate.name}`,
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

  const handleSendNotification = async (estate: Estate) => {
    const message = prompt('Enter notification message:');
    if (!message) return;

    try {
      const notifications = estate.members.map(memberId => ({
        userId: memberId,
        type: 'estate',
        title: `Announcement from ${estate.name}`,
        message,
        read: false,
        createdAt: serverTimestamp()
      }));

      await Promise.all(
        notifications.map(notification =>
          addDoc(collection(db, 'notifications'), notification)
        )
      );

      toast.success('Notification sent successfully');
    } catch (error) {
      console.error('Error sending notification:', error);
      toast.error('Failed to send notification');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <Building2 className="h-6 w-6 text-indigo-600" />
            <h1 className="ml-2 text-2xl font-semibold">Estates</h1>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Estate
          </button>
        </div>

        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              value={globalFilter ?? ''}
              onChange={e => setGlobalFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Search estates..."
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th
                      key={header.id}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {table.getRowModel().rows.map(row => (
                <tr key={row.id}>
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-6 py-4 whitespace-nowrap">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="px-3 py-1 border rounded text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="px-3 py-1 border rounded text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
          <span className="text-sm text-gray-500">
            Page {table.getState().pagination.pageIndex + 1} of{' '}
            {table.getPageCount()}
          </span>
        </div>
      </div>

      {/* Create Estate Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">Create New Estate</h2>
            <form onSubmit={handleCreateEstate}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Estate Name
                  </label>
                  <input
                    type="text"
                    value={newEstate.name}
                    onChange={e => setNewEstate({ ...newEstate, name: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Address
                  </label>
                  <input
                    type="text"
                    value={newEstate.address}
                    onChange={e => setNewEstate({ ...newEstate, address: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Type
                  </label>
                  <select
                    value={newEstate.type}
                    onChange={e => setNewEstate({ ...newEstate, type: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  >
                    <option value="residential">Residential</option>
                    <option value="commercial">Commercial</option>
                    <option value="mixed">Mixed Use</option>
                  </select>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700"
                >
                  Create Estate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">Invite Member</h2>
            <form onSubmit={handleInviteMember}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    required
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Service Charge Modal */}
      {showChargeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">Create Service Charge</h2>
            <form onSubmit={handleCreateCharge}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Title
                  </label>
                  <input
                    type="text"
                    value={newCharge.title}
                    onChange={e => setNewCharge({ ...newCharge, title: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Amount (₦)
                  </label>
                  <input
                    type="number"
                    value={newCharge.amount}
                    onChange={e => setNewCharge({ ...newCharge, amount: parseFloat(e.target.value) })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    required
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={newCharge.dueDate}
                    onChange={e => setNewCharge({ ...newCharge, dueDate: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    value={newCharge.description}
                    onChange={e => setNewCharge({ ...newCharge, description: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    rows={3}
                    required
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowChargeModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700"
                >
                  Create Charge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Estates;