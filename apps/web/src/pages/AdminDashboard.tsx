
import { useState, useEffect } from "react";
import { getWaitlistEntries, updateWaitlistStatus, deleteWaitlistEntry, WaitlistEntry } from "@/services/waitlistService";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAuthContext } from "@/contexts/AuthContext";

export function AdminDashboard() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const data = await getWaitlistEntries();
      setEntries(data || []);
    } catch (error) {
      toast({
        title: "Error fetching entries",
        description: "Could not load waitlist data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const [filterType, setFilterType] = useState<string | null>(null);

  useEffect(() => {
    fetchEntries();
  }, []);

  const filteredEntries = entries.filter(entry => {
    if (!filterType) return true;
    return entry.user_type === filterType;
  });

  const { user } = useAuthContext();

  const handleUpdateStatus = async (id: string, status: 'approved' | 'pending' | 'rejected') => {
    setUpdating(id);
    
    let approved_by = null;
    let approved_at = null;

    if (status === 'approved') {
      if (user?.email === 'gnvenkatapathiraju@gmail.com') {
        approved_by = 'Venkat';
      } else if (user?.email === 'ravenso.here@gmail.com') {
        approved_by = 'Ravi';
      } else {
        approved_by = user?.user_metadata?.full_name || user?.email || 'Admin';
      }
      approved_at = new Date().toISOString();
    }

    try {
      await updateWaitlistStatus(id, status, approved_by, approved_at);
      
      toast({
        title: `User ${status === 'approved' ? 'Approved' : 'Revoked'}`,
        description: `Status updated successfully.`,
        className: status === 'approved' ? "bg-green-600 text-white" : "",
      });
      
      // Refresh list locally with new approved info
      setEntries(entries.map(e => e.id === id ? { 
        ...e, 
        status, 
        approved_by: approved_by as string | null, // Cast for local state compatibility
        approved_at: approved_at as string | null 
      } : e));
    } catch (error) {
      console.error(error);
      toast({
        title: "Error updating user",
        description: "Could not change status.",
        variant: "destructive",
      });
    } finally {
      setUpdating(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user completely?')) return;
    
    setUpdating(id);
    try {
      await deleteWaitlistEntry(id);
      toast({
        title: "User Deleted",
        description: "Waitlist entry removed.",
      });
      // Refresh list locally
      setEntries(entries.filter(e => e.id !== id));
    } catch (error) {
      console.error(error);
      toast({
        title: "Error deleting user",
        description: "Could not remove entry.",
        variant: "destructive",
      });
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Beta Waitlist Admin</h1>
        <div className="flex items-center gap-4">
          <Select onValueChange={(val) => setFilterType(val === 'all' ? null : val)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="Student">Student</SelectItem>
              <SelectItem value="Professional">Professional</SelectItem>
              <SelectItem value="Parent">Parent</SelectItem>
              <SelectItem value="Founder">Founder</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchEntries} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-card border rounded-lg p-4 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">Total Users</p>
          <div className="text-2xl font-bold">{entries.length}</div>
        </div>
        <div className="bg-green-50/50 border border-green-100 rounded-lg p-4 shadow-sm">
          <p className="text-sm font-medium text-green-600">Approved</p>
          <div className="text-2xl font-bold text-green-700">
            {entries.filter(e => e.status === 'approved').length}
          </div>
        </div>
        <div className="bg-yellow-50/50 border border-yellow-100 rounded-lg p-4 shadow-sm">
          <p className="text-sm font-medium text-yellow-600">Pending</p>
          <div className="text-2xl font-bold text-yellow-700">
            {entries.filter(e => e.status === 'pending').length}
          </div>
        </div>
        <div className="bg-red-50/50 border border-red-100 rounded-lg p-4 shadow-sm">
          <p className="text-sm font-medium text-red-600">Rejected</p>
          <div className="text-2xl font-bold text-red-700">
            {entries.filter(e => e.status === 'rejected').length}
          </div>
        </div>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>User Type</TableHead>
              <TableHead>Motivation</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Approved By</TableHead>
              <TableHead>Approved At</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEntries.length === 0 && !loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No one matching that filter.
                </TableCell>
              </TableRow>
            ) : (
              filteredEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">{entry.email}</TableCell>
                  <TableCell>
                    <Badge variant={entry.status === 'approved' ? 'default' : 'secondary'}>
                      {entry.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs px-2 py-1 rounded bg-muted">
                       {entry.user_type || '-'}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-[150px] truncate" title={entry.motivation}>
                    <span className="text-sm">
                      {entry.motivation || '-'}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">
                    {entry.phone || '-'}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {entry.joined_at ? formatDistanceToNow(new Date(entry.joined_at), { addSuffix: true }) : '-'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {entry.approved_by || '-'}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {entry.approved_at ? formatDistanceToNow(new Date(entry.approved_at), { addSuffix: true }) : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                    {entry.status !== 'approved' && (
                      <Button 
                        size="sm" 
                        onClick={() => handleUpdateStatus(entry.id, 'approved')}
                        disabled={updating === entry.id}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {updating === entry.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approve"}
                      </Button>
                    )}
                    {entry.status === 'approved' && (
                      <Button 
                        size="sm" 
                        onClick={() => handleUpdateStatus(entry.id, 'pending')}
                        disabled={updating === entry.id}
                        className="bg-yellow-600 hover:bg-yellow-700"
                      >
                        {updating === entry.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Revoke"}
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => handleDelete(entry.id)}
                      disabled={updating === entry.id}
                    >
                      Delete
                    </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
