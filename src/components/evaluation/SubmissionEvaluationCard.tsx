import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const SubmissionEvaluationCard = ({ evaluation, onOpen }: any) => {
    return (
        <Card className="backdrop-blur-sm bg-card/50 border-border/50 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader>
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                        <CardTitle className="text-xl mb-2">{evaluation.startup_name}</CardTitle>
                        <CardDescription className="text-sm text-muted-foreground line-clamp-2">{evaluation.problem_statement}</CardDescription>
                    </div>
                    <Badge className="text-lg px-4 py-1 font-bold min-w-[80px] justify-center">{evaluation.overall_average ? `${Number(evaluation.overall_average).toFixed(1)}/20` : 'N/A'}</Badge>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex justify-end">
                    <button className="text-sm text-primary underline" onClick={() => onOpen(evaluation)}>View Details</button>
                </div>
            </CardContent>
        </Card>
    );
};
