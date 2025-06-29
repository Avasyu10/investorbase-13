
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { submitEurekaForm, EurekaFormData } from '@/lib/api/eurekaSubmit';
import { toast } from 'sonner';

export const EurekaFormSubmissionExample = () => {
  const [formData, setFormData] = useState<EurekaFormData>({
    idea_id: '',
    eureka_id: '',
    question_1: '',
    question_2: '',
    question_3: '',
    question_4: '',
    question_5: '',
    question_6: '',
    question_7: '',
    question_8: '',
    question_9: '',
    company_name: '',
    submitter_email: '',
    form_slug: 'eureka-form'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field: keyof EurekaFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.idea_id || !formData.eureka_id) {
      toast.error('Please fill in required fields: idea_id and eureka_id');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const response = await submitEurekaForm(formData);
      
      if (response.success) {
        toast.success('Form submitted successfully!');
        console.log('Submission response:', response);
      } else {
        toast.error(response.error || 'Failed to submit form');
      }
    } catch (error) {
      console.error('Submission error:', error);
      toast.error('Failed to submit form');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Eureka Form Submission Example</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Idea ID *</label>
              <Input
                value={formData.idea_id}
                onChange={(e) => handleInputChange('idea_id', e.target.value)}
                placeholder="Enter idea ID"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Eureka ID *</label>
              <Input
                value={formData.eureka_id}
                onChange={(e) => handleInputChange('eureka_id', e.target.value)}
                placeholder="Enter eureka ID"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Company Name</label>
              <Input
                value={formData.company_name || ''}
                onChange={(e) => handleInputChange('company_name', e.target.value)}
                placeholder="Enter company name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Submitter Email</label>
              <Input
                type="email"
                value={formData.submitter_email || ''}
                onChange={(e) => handleInputChange('submitter_email', e.target.value)}
                placeholder="Enter email"
              />
            </div>
          </div>

          {/* Questions 1-9 */}
          {Array.from({ length: 9 }, (_, i) => {
            const questionKey = `question_${i + 1}` as keyof EurekaFormData;
            return (
              <div key={questionKey}>
                <label className="block text-sm font-medium mb-1">
                  Question {i + 1}
                </label>
                <Textarea
                  value={formData[questionKey] as string || ''}
                  onChange={(e) => handleInputChange(questionKey, e.target.value)}
                  placeholder={`Enter answer for question ${i + 1}`}
                  rows={3}
                />
              </div>
            );
          })}

          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Eureka Form'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
