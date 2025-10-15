import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Props {
    submissionId?: string | null;
}

const humanize = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const SubmissionDetailsDialog = ({ submissionId }: Props) => {
    const [open, setOpen] = useState(false);
    const [data, setData] = useState<Record<string, unknown> | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!open) return;
        if (!submissionId) return;

        const fetch = async () => {
            setLoading(true);
            try {
                const { data: row, error } = await supabase
                    .from('startup_submissions')
                    .select('*')
                    .eq('id', submissionId)
                    .maybeSingle();

                if (error) {
                    console.error('Error fetching submission details', error);
                    toast({ title: 'Error', description: 'Failed to fetch submission details', variant: 'destructive' });
                    setData(null);
                    return;
                }

                setData(row ?? null);
            } catch (err) {
                console.error('Fetch error', err);
                toast({ title: 'Error', description: 'Failed to fetch submission details', variant: 'destructive' });
                setData(null);
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, [open, submissionId]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    View Submission
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl w-[95vw] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        Submission Details
                    </DialogTitle>
                </DialogHeader>

                <div className="mt-4">
                    {loading ? (
                        <div className="flex justify-center items-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : data ? (
                        <div className="space-y-4">
                            <div className="bg-muted/50 p-4 rounded-lg">
                                <h3 className="font-semibold text-lg mb-1">{(data.startup_name as string) ?? 'Startup'}</h3>
                                <p className="text-sm text-muted-foreground">Submitted: {data.created_at ? new Date(String(data.created_at)).toLocaleString() : ''}</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {Object.keys(data).filter(k => !['id', 'created_at'].includes(k)).map((k) => (
                                    <div key={k} className="bg-background/20 p-3 rounded">
                                        <div className="text-sm text-muted-foreground mb-1">{humanize(k)}</div>
                                        <div className="text-sm text-white whitespace-pre-wrap">{data[k] == null || data[k] === '' ? '—' : String(data[k])}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                            <h3 className="text-lg font-lg mb-2">No Submission Found</h3>
                            <p className="text-muted-foreground">No submission was found for this id.</p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default SubmissionDetailsDialog;
