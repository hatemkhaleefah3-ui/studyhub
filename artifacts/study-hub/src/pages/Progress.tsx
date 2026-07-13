import { useState } from "react";
import { useStudyData, StudyType } from "@/hooks/useStudyData";
import { GlassCard } from "@/components/shared/GlassCard";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

type TypeFilter = "all" | StudyType;

export function Progress() {
  const { subjects } = useStudyData();

  // View-only filter — the score itself always stays a single combined
  // weighted average; this only changes which exams are included in the
  // view (spec: "combined score with a view-only filter").
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  const examMatchesFilter = (type: StudyType) => typeFilter === "all" || type === typeFilter;

  // Calculate overall GPA
  let totalWeightedGrade = 0;
  let totalWeight = 0;

  subjects.forEach(subject => {
    subject.exams.forEach(exam => {
      if (exam.grade && examMatchesFilter(exam.type)) {
        const num = parseFloat(exam.grade);
        if (!isNaN(num)) {
          const w = exam.weight || 1;
          totalWeightedGrade += num * w;
          totalWeight += w;
        }
      }
    });
  });

  const overallAvg = totalWeight > 0 ? (totalWeightedGrade / totalWeight).toFixed(1) : null;

  const filterOptions: { value: TypeFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "theoretical", label: "Theoretical" },
    { value: "practical", label: "Practical" },
  ];

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Progress</h1>
          <p className="text-muted-foreground text-lg">Academic overview</p>
        </div>
        <div className="bg-secondary/50 p-1 rounded-xl flex gap-1 w-fit">
          {filterOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => setTypeFilter(opt.value)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                typeFilter === opt.value ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <GlassCard className="p-8 flex items-center justify-between bg-gradient-to-br from-primary/10 to-transparent">
        <div>
          <h2 className="text-xl font-semibold mb-1">Overall Average</h2>
          <p className="text-muted-foreground text-sm">Weighted across all graded exams</p>
        </div>
        <div className="text-5xl font-black text-primary">
          {overallAvg !== null ? `${overallAvg}%` : '—'}
        </div>
      </GlassCard>

      <div className="space-y-8 mt-12">
        {subjects.map(subject => {
          const gradedExams = subject.exams.filter(e => e.grade && examMatchesFilter(e.type)).map(e => ({
            name: e.name,
            grade: parseFloat(e.grade!),
            weight: e.weight || 1
          })).filter(e => !isNaN(e.grade));

          if (gradedExams.length === 0) {
            return (
              <GlassCard key={subject.id} className="p-6 opacity-60">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: subject.color }} />
                  <h3 className="text-xl font-bold">{subject.name}</h3>
                </div>
                <p className="text-muted-foreground text-sm pl-7">No graded exams yet.</p>
              </GlassCard>
            )
          }

          let subjTotalWGrade = 0;
          let subjTotalWeight = 0;
          gradedExams.forEach(e => {
            subjTotalWGrade += e.grade * e.weight;
            subjTotalWeight += e.weight;
          });
          const subjAvg = Math.round(subjTotalWGrade / subjTotalWeight);

          // For recharts
          const chartData = gradedExams.map((e, i) => ({
            name: e.name.length > 10 ? e.name.substring(0,10)+'...' : e.name,
            grade: e.grade,
            index: i+1
          }));

          return (
            <GlassCard key={subject.id} className="p-6 overflow-hidden relative">
              <div className="absolute top-0 left-0 w-1.5 h-full" style={{ backgroundColor: subject.color }} />
              
              <div className="flex flex-col md:flex-row gap-8 pl-4">
                <div className="w-full md:w-1/3 space-y-6">
                  <div>
                    <h3 className="text-2xl font-bold mb-1">{subject.name}</h3>
                    <p className="text-3xl font-black" style={{ color: subject.color }}>{subjAvg}%</p>
                    <p className="text-sm text-muted-foreground mt-1 font-semibold uppercase tracking-wider">Subject Average</p>
                  </div>
                  
                  <div className="space-y-3">
                    {gradedExams.map((exam, i) => (
                      <div key={i} className="flex justify-between items-center text-sm bg-secondary/50 px-3 py-2 rounded-lg">
                        <span className="font-medium truncate pr-4">{exam.name}</span>
                        <span className="font-bold">{exam.grade}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {chartData.length >= 2 && (
                  <div className="w-full md:w-2/3 h-64 mt-4 md:mt-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
                          dy={10}
                        />
                        <YAxis 
                          domain={[0, 100]} 
                          axisLine={false} 
                          tickLine={false}
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                        />
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '12px', border: '1px solid hsl(var(--border))', backdropFilter: 'blur(16px)' }}
                          itemStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="grade" 
                          stroke={subject.color} 
                          strokeWidth={4}
                          dot={{ r: 6, fill: 'hsl(var(--card))', strokeWidth: 3, stroke: subject.color }}
                          activeDot={{ r: 8 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </GlassCard>
          )
        })}
      </div>
    </div>
  );
}
